const {createServer} = require("http");
const {parse} = require("url");
const {resolve, sep} = require("path");
const {stat, readdir, rmdir, unlink, mkdir} = require("fs").promises;
const {createReadStream, createWriteStream} = require("fs");
const mime = require("mime");

const rootDir = process.cwd() + sep + "public";
const landing = sep + "index.html";

const methods = Object.create(null);

createServer((request, response) => {
    let handler = methods[request.method] || notAllowed;
    handler(request) 
        .catch(error => {
            console.log(error);
            if (error.status != null) return error;
            return {body: String(error), status: 500};
        })
        .then(({body, status = 200, type = "text/plain"}) => {
            response.writeHead(status, {"Content-Type": type});
            if (body && body.pipe) body.pipe(response);
            else response.end(body);
        });

}).listen(8000);

async function notAllowed(request) {
    return {
        status: 405,
        body: `Method ${request.method} not allowed.`
    };
}

function urlPath(url) {
    let {pathname} = parse(url);
    let path = resolve(rootDir + decodeURIComponent(pathname));
    if (!path.startsWith(rootDir)) {
        throw {status: 403, body: "Forbidden\n"};
    }
    return path;
}

methods.GET = async function(request) {
    let path = urlPath(request.url);
    let stats;
    if (path == rootDir && request.headers.landing != "false") {
        try {
            stats = await stat(path + landing);
            path = path + landing;
        } catch (error) {}
    } 
    
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return {status: 404, body: "File not found\n"};
    }

    if (stats.isDirectory()) {
        return {body: (await readdir(path)).join("\n"),
                type: "directory"};
    } else {
        return {body: createReadStream(path),
                type: mime.getType(path)};
    }
};

methods.DELETE = async function(request) {
    let path = urlPath(request.url);
    let stats;
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return {status: 204};
    }
    if (stats.isDirectory()) await rmdir(path);
    else await unlink(path);
    return {status: 204};
}

function pipeStream(from, to) {
    return new Promise((resolve, reject) => {
        from.on("error", reject);
        to.on("error", reject);
        to.on("finish", resolve);
        from.pipe(to);
    });
}

methods.PUT = async function(request) {
    let path = urlPath(request.url);
    await pipeStream(request, createWriteStream(path));
    return {status: 204};
}

methods.MKCOL = async function(request) {
    let path = urlPath(request.url)
    let stats;
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        await mkdir(path);
        return {status: 204};
    }
    if (stats.isDirectory()) {
        return {status: 204, body: "Directory already exists.\n"} 
    } else {
        return {status: 400, body: "Not a directory.\n"};
    }
}