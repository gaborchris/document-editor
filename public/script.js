function getType(path) {
    return fetch(path).then(resp => {
        return {name: path, 
                "type": resp.headers.get("Content-Type")};
    });
}

class Editor {
    constructor(updateCallback) {
        this.filepath = "";
        this.content = "";
        let save = document.querySelector("#save");
        save.addEventListener("click", () => this.save());
        let deleteButton = document.querySelector("#delete");
        deleteButton.addEventListener("click", () => this.delete());
        this.update = updateCallback;
        this.close();

    }

    open(filepath) {
        this.filepath = filepath;
        fetch(filepath)
        .then(resp => resp.text())
        .then(text => this.content = text)
        .then(() => this.display());
    }

    display() {
        let editor = document.querySelector("#editor");
        editor.style.visibility = "visible";
        let window = document.querySelector("#editor textarea");
        let newWindow = document.createElement("textarea");
        let title = document.querySelector("#filename");
        title.textContent = this.filepath;
        window.parentNode.replaceChild(newWindow, window);
        newWindow.textContent = this.content;
        newWindow.addEventListener("input", () => {
            this.content = newWindow.value;
        });
    }

    save() {
        if (this.filepath != "") {
            fetch(this.filepath, 
                {method: "PUT", 
                body: this.content}
            );
        }
    }

    delete() {
        let confirmation = document.querySelector("#confirmation");
        if (this.filepath.length == 0) return;
        let name = document.querySelector("#delete-filename");
        name.textContent = this.filepath;
        confirmation.style.visibility = "visible";
        let accept = document.querySelector("#delete-confirm");
        let cancel = document.querySelector("#delete-cancel");
        cancel.addEventListener("click", () => {
            confirmation.style.visibility = "hidden";
        });
        accept.addEventListener("click", () => {
            fetch(this.filepath, {method: "DELETE"});
            confirmation.style.visibility = "hidden";
            console.log("deleting", this.filepath);
            this.update();
            this.close();
        });
    }
    close() {
        let editor = document.querySelector("#editor");
        editor.style.visibility = "hidden";
    }

}

class State {
    constructor(root) {
        this.currentPath = root;
        this.paths = [];
        this.window = document.querySelector("#filelist");
        this.updateFiles();
        let backButton = document.querySelector("#back");
        backButton.addEventListener("click", () => this.back());
        this.editor = new Editor(() => {
            this.updateFiles();
        });
        this.fileCreator = new FileCreator(this.currentPath, filename => {
            this.updateFiles();
            this.editor.open(filename);
        });
    }

    createFileDom(filename) {
        let div = document.createElement("div");
        div.appendChild(document.createTextNode(filename));
        div.addEventListener("click", () => {
            this.editor.open(filename);
        })
        return div;
    }

    createDirDom(dirname) {
        let div = document.createElement("div");
        div.style.color = "blue";
        div.appendChild(document.createTextNode(dirname));
        div.addEventListener("click", () => {
            this.paths.push(this.currentPath);
            this.currentPath = dirname + "/";
            this.fileCreator.updatePath(this.currentPath);
            this.updateFiles();
        });
        return div;
    }

    back() {
        if (this.paths.length > 0) {
            this.currentPath = this.paths.pop();
            this.fileCreator.updatePath(this.currentPath);
            this.updateFiles();
        }
    }
    
    updateFiles() {
        let path = this.currentPath;
        let level = document.querySelector("#pathname");
        let container = document.querySelector("#filelist .container");

        this.window.removeChild(container);
        container = document.createElement("div");
        container.className = "container";
        this.window.appendChild(container);
        level.textContent = path;

        fetch(path, {headers: {landing: false}})
            .then(resp => resp.text()) 
            .then(text => { 
                if (text.length == 0) return;
                let files = text.split("\n");
                let types = files.map(filename => getType(path+filename));
                Promise.all(types).then(files => {
                    for (let file of files) {
                        if (file.type == "directory") 
                            container.appendChild(this.createDirDom(file.name));
                        else 
                            container.appendChild(this.createFileDom(file.name));
                    }
                });
            });
        }
}


class FileCreator {
    constructor(path, updateCallback) {
        this.currentPath = path;
        let newButton = document.querySelector("#create");
        this.window = document.querySelector("#popup");
        newButton.addEventListener("click", () => {
            this.window.style.visibility = "visible";
        });
        let cancelButton = document.querySelector("#create-cancel");
        cancelButton.addEventListener("click", event => {
            this.window.style.visibility = "hidden";
            event.preventDefault();
        });
        let createButton = document.querySelector("#create-confirm");
        createButton.addEventListener("click", event => {
            event.preventDefault();
            this.create();
        });
        this.update = updateCallback;

    }
    updatePath(path) {
        this.currentPath = path;
    }
    
    create() {
        let selection = document.querySelectorAll("#popup input");
        let type = Array.from(selection)
        .filter(input => input.type == "radio")
        .filter(radio => radio.checked == true)[0].value;
        let fileInput = Array.from(selection).filter(a => a.type == "text")[0];
        let filename = fileInput.value;
        filename = filename.trim().split(" ").join("");
        let message = document.querySelector("#popup #popup-message");
        message.textContent = "";
        if (filename.match(/[\/]+/)) {
            message.textContent = "Please avoid / characters";
            return;
        } else if (filename.length == 0) {
            message.textContent = "Enter a valid filename";
            return;
        }
        this.exists(filename).then(exists => {
            if (exists) {
                message.textContent = "File already exists.";
            } else {
                if (type == "file") {
                    console.log("Creating", this.currentPath + filename);
                    fetch(this.currentPath + filename, 
                        {method: "PUT", 
                        body: ""}
                    );
                } else if (type == "directory") {
                    fetch(this.currentPath + filename, 
                        {method: "MKCOL"}
                    );
                } 
                fileInput.value = "";
                this.update(this.currentPath + filename);
                this.window.style.visibility = "hidden";
            }
        });

    }
    exists(filename) {
        console.log(this.currentPath);
        return fetch(this.currentPath, {headers: {landing: false}})
        .then(resp => resp.text())
        .then(text => {
            let files = text.split("\n");
            return files.includes(filename);
        });
    }
}


let root = new State("/");


