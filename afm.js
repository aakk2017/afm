
// created: 2025/04/04 4pm

let onView = 0; // 0 is height, 1 is amplitude error, 2 is phase
let info = {};
let imageInfo = [];
let dataText = "";
let data = [];

const heightTab = document.getElementById("height-tab");
const errorTab = document.getElementById("error-tab");
const phaseTab = document.getElementById("phase-tab");
const afmImage = document.getElementById("afm-image");
const tabs = [heightTab, errorTab, phaseTab];
const dataArea = document.getElementById("data");

tabs.forEach((element) => {
    element.addEventListener("click", (e) => {handleClickOnTab(e);});
});

function initializePage() {
    info = {};
    imageInfo = [];
    dataText = "";
    dataArea.innerHTML = "";
    data = [];
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
}

function readAfm(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        const length = reader.result.byteLength;
        const header = reader.result.slice(0, 40960);
        parseHeader(header);
        const rawData = reader.result.slice(40960, length);
        parseData(rawData);
        printData();
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

function plotImage() {

}
function printData() {

}

function handleClickOnTab(e) {
    let targetView = onView;
    switch(e.target.id) {
        case "height-tab":
            targetView = 0;
            return;
        case "error-tab":
            targetView = 1;
            return;
        case "phase-tab":
            targetView = 2;
            return;
    }
    if(targetView !== onView) {
        tabs[onView].removeAttribute("on-view");
        onView = targetView;
        tabs[onView].setAttribute("on-view");
        plotImage();
    }
}