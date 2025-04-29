
// created: 2025/04/04 4pm

// const { param } = require("express/lib/request");

let onView = 0; // 0 is height, 1 is amplitude error, 2 is phase
let info = {};
let imageInfo = [];
let dataText = "";
let data = [];
let dataRanges = [[0, 0], [0, 0], [0, 0]];
let loaded = false;

let zSense = 0;
let zScale = 0;
let zRange = 32767;
let errorSense = 0;
let errorScale = 0;
let errorRange = 32767;
let sizeX = 10;
let sizeY = 10;
let unit = "~m";
let xNo = 256;
let yNo = 256;

const heightTab = document.getElementById("height-tab");
const errorTab = document.getElementById("error-tab");
const phaseTab = document.getElementById("phase-tab");
const tabs = [heightTab, errorTab, phaseTab];
const dataArea = document.getElementById("data");
const infoP = document.getElementById("p-info");

function handleClickOnTab(e) {
    let targetView = onView;
    switch(e.target.id) {
        case "height-tab":
            targetView = 0;
            break;
        case "error-tab":
            targetView = 1;
            break;
        case "phase-tab":
            targetView = 2;
            break;
    }
    if(targetView !== onView) {
        tabs[onView].removeAttribute("on-view");
        onView = targetView;
        tabs[onView].setAttribute("on-view", "");
        if(loaded) {
            plotImage(onView);
        }
    }
}

tabs.forEach((element, i, t) => {
    t[i].onclick = handleClickOnTab;
});

function initializePage() {
    loaded = false;
    info = {};
    imageInfo = [];
    dataText = "";
    dataArea.innerHTML = "";
    data = [];
    dataRanges = [[0, 0], [0, 0], [0, 0]];
    infoP.innerHTML = "";
}

function parseHeader(header) {
    const decoder = new TextDecoder("utf-8");
    const headerString = decoder.decode(header);
    const lists = headerString.split("\\*");
    lists.forEach((e) => {
        if(e) {
            e = e.trim();
            let param = e.split("\\");
            param.forEach((e, i, p) => {
                p[i] = e.trim();
            });
            if(param[0] === "Ciao image list") {
                let imageParam = {};
                param.forEach((p) => {
                    if(p.includes(": ")) {
                        const paramKeyValue = p.split(": ");
                        imageParam[paramKeyValue[0]] = paramKeyValue[1];
                    }
                });
                imageInfo.push(imageParam);
            } else {
                let listKey = param[0];
                let listValue = {};
                param.forEach((p) => {
                    if(p.includes(": ")){
                        const paramKeyValue = p.split(": ");
                        listValue[paramKeyValue[0]] = paramKeyValue[1];
                    }
                });
                info[listKey] = listValue;
            }
        }
    });
    if(imageInfo[0]["Scan Size"]) {
        sizeX = parseFloat(imageInfo[0]["Scan Size"].split(" ")[0]);
        sizeY = parseFloat(imageInfo[0]["Scan Size"].split(" ")[1]);
        unit = imageInfo[0]["Scan Size"].split(" ")[2];
    } else if(imageInfo[0]["Scan size"]) {
        sizeX = parseFloat(imageInfo[0]["Scan size"].split(" ")[0]);
        sizeY = parseFloat(imageInfo[0]["Scan size"].split(" ")[1]);
        unit = imageInfo[0]["Scan size"].split(" ")[2];
    }
    zScale = parseFloat(imageInfo[0]["@2:Z scale"].split(") ")[1].split(" ")[0]);
    errorScale = parseFloat(imageInfo[1]["@2:Z scale"].split(") ")[1].split(" ")[0]);
    let zSenseParamName = "@" + imageInfo[0]["@2:Z scale"].split("[")[1].split("]")[0];
    for(const params in info) {
        if(info[params][zSenseParamName]) {
            zSense = parseFloat(info[params][zSenseParamName].split(" ")[1]);
        }
    }
    let errorParamName = "@" + imageInfo[1]["@2:Z scale"].split("[")[1].split("]")[0];
    for(const params in info) {
        if(info[params][errorParamName]) {
            errorSense = parseFloat(info[params][errorParamName].split(" ")[1]);
        }
    }
    xNo = imageInfo[0]["Samps/line"];
    yNo = imageInfo[0]["Number of lines"];
}

function parseData(rawData) {
    const singleImageLength = parseInt(imageInfo[0]["Data length"]);
    const singleImagePts = singleImageLength / 2;
    const intData = new Int16Array(rawData);
    if(intData.length >= singleImagePts) {
        data.push(intData.slice(0, singleImagePts));
    }
    if(intData.length >= singleImagePts * 2) {
        data.push(intData.slice(singleImagePts, singleImagePts * 2));
    }
    if(intData.length >= singleImagePts * 3) {
        data.push(intData.slice(singleImagePts * 2, singleImagePts * 3));
    }
    for(let i = 0; i < singleImagePts; i++) {
        for(let j = 0; j < 3; j++) {
            if(Number(data[j][i]) > dataRanges[j][1]) {
                dataRanges[j][1] = Number(data[j][i]);
            }
            if(Number(data[j][i]) < dataRanges[j][0]) {
                dataRanges[j][0] = Number(data[j][i]);
            }
        }
    }
    zRange = Math.max(dataRanges[0][1], -dataRanges[0][0]);
    errorRange = Math.max(dataRanges[1][1], -dataRanges[1][0]);
}

function readAfm(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        const length = reader.result.byteLength;
        const header = reader.result.slice(0, 40960);
        parseHeader(header);
        const rawData = reader.result.slice(40960, length);
        parseData(rawData);
        plotImage(onView);
        printData();
        loaded = true;
    });
    if(file) {
        reader.readAsArrayBuffer(file);
    }
}

function viewFile(){
    const file = document.getElementById("open-file").files[0];
    initializePage();
    readAfm(file);
}

function plotImage(i) {
    const afmImage = document.getElementById("afm-image");
    const ctx = afmImage.getContext("2d", {
        "willReadFrequently": true
    });
    afmImage.width = imageInfo[0]["Samps/line"];
    afmImage.height = imageInfo[0]["Number of lines"];
    let saturation;
    for(let y = 0; y < yNo; y++) {
        for(let x = 0; x < xNo; x++) {
            saturation = (data[i][y*xNo+x] - dataRanges[i][0]) / (dataRanges[i][1] - dataRanges[i][0]) * 100;
            ctx.fillStyle = `hsl(60, ${saturation}%, 50%)`;
            ctx.fillRect(x, yNo - y - 1, 1, 1);
        }
    }
    const imgContainerWidth = afmImage.parentElement.clientWidth;
    const scale = imgContainerWidth * 0.9 / Math.max(xNo, yNo);
    afmImage.style.transform = `scale(${scale}, ${scale})`;
}
function printData() {
    dataText = "Z\tError\tPhase\tX\tY\n";
    const w = imageInfo[0]["Samps/line"];
    const h = imageInfo[0]["Number of lines"];
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let index = y * w + x;
            let lineText = "" + (data[0][index]*zScale*zSense/zRange/2) 
                + "\t" + (data[1][index]*errorScale*errorSense/65536) 
                + "\t" + (data[2][index]*360/65536) 
                + "\t" + (x*sizeX/xNo) 
                + "\t" + (y*sizeY/yNo) + "\n";
            dataText += lineText;
        }
    }
    dataArea.innerHTML = dataText;
}

