function getType(path) {
    return fetch(path).then(resp => {
        return {name: path, 
                "type": resp.headers.get("Content-Type")};
    });
}

class Editor {
    constructor() {
        this.filepath = "";
        this.content = "";
        let save = document.querySelector("#save");
        save.addEventListener("click", () => this.save());
    }

    open(filepath) {
        this.filepath = filepath;
        fetch(filepath)
        .then(resp => resp.text())
        .then(text => this.content = text)
        .then(() => this.display());
    }

    display() {
        let window = document.querySelector("#editor textarea");
        let newWindow = document.createElement("textarea");
        window.parentNode.replaceChild(newWindow, window);
        newWindow.textContent = this.content;
        newWindow.addEventListener("input", () => {
            this.content = newWindow.value;
        });
    }

    save() {
        fetch(this.filepath, 
            {method: "PUT", 
            body: this.content}
        );
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
        this.editor = new Editor();
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
            this.updateFiles();
        });
        return div;
    }

    back() {
        if (this.paths.length > 0) {
            this.currentPath = this.paths.pop();
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

function createNewFile() {
    let popup = document.createElement("div");
    // popup.style.

}


let root = new State("/");


