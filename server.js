
import http from "http";
import fs from "fs";
import url from "url";
import path from "path";

const server = http.createServer(function(request, response) {
    let pathObj = url.parse(request.url, true);
    if (pathObj.pathname === "/" || pathObj === "/index")
        pathObj.pathname = "/index.html";
    let filePath = path.join(path.resolve(), decodeURI(pathObj.pathname));
    fs.readFile(filePath, "binary", function(err, fileContent) {
        if (err) {
            console.log("404 " + filePath);
            response.writeHead(404, "not found");
            response.end("<h1>404 Not Found</h1>");
            return;
        }
        console.log("ok " + filePath);
        response.write(fileContent, "binary");
        response.end();
    });
}).listen(3000, () => {
    console.log("visit http://localhost:3000 \nenter 'exit'/'e'/'quit'/'q'/'close' to close the program.");
});

import { createInterface } from "readline";
let rl = createInterface({ input: process.stdin });
rl.on("line", async line => {
    switch (line.trim().toLowerCase()) {
    case "exit": case "e": case "quit": case "q": case "close":
        server.close();
        process.exitCode = 0;
        rl.close();
        break;
    }
});
