const http = require('http');
const xmlHttpRequest = require('xhr2');
const api_data = require('./data.js');


const hostname = '127.0.0.1';
const port = 3000;

var officeMap = new Map();
var notified = [];

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World\n');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
    callApi();
    setTimeout(callApi, 60000);
});

function callApi() {
    var xmlHttp = new xmlHttpRequest();
    xmlHttp.addEventListener("load", function () {
        // console.log(xmlHttp.responseTsext);
        handleData(xmlHttp.responseText);
    }, false);
    xmlHttp.open("GET", "https://eservices.es2.immd.gov.hk/surgecontrolgate/ticket/getSituation");
    xmlHttp.send();
}

function handleData(response) {
    var obj = JSON.parse(response);
    var data = obj.data;
    var office = obj.office;
    if (officeMap.size == 0) {
        checkOffice(office);
    }
    checkDate(data);
}

function checkOffice(obj) {
    obj.forEach(element => {
        var key = element.officeId;
        var value = element.cht.district;
        // console.log(`${key} : ${value}`);
        officeMap.set(key, value);
    });
}

function checkDate(obj) {
    obj.forEach(element => {
        var parts = element.date.split('/');
        var date = new Date(parts[2], parts[0] - 1, parts[1]);
        if (!withinRange(date.getTime())) {

            return;
        }
        var district = element.officeId;
        //quota-g = 尚有, quota-y = 少量
        if (element.quotaR == "quota-g") {
            notify(date, district, "R", "g");
        }
        if (element.quotaR == "quota-y") {
            notify(date, district, "R", "y");
        }
        if (element.quotaK == "quota-g") {
            notify(date, district, "K", "g");
        }
        if (element.quotaK == "quota-y") {
            notify(date, district, "K", "y");
        }
    });

}

function withinRange(date) {
    var from1 = new Date(2023, 6 - 1, 13).getTime();
    var to1 = new Date(2023, 6 - 1, 16).getTime();
    var from2 = new Date(2023, 6 - 1, 24).getTime();
    var to2 = new Date(2023, 6 - 1, 30).getTime();

    return (date >= from1 && date <= to1) || (date >= from2 && date <= to2);
}

function notify(date, district, quota, quota_amount) {
    var id = `${date.toDateString()}:${district}`;
    if (notified.indexOf(id) >= 0) {
        return;
    }
    else {
        notified.push(id);
    }

    var text = "有位了!!!!快book!!!!\n";
    text += "日期：" + date.toDateString() + "\n";
    text += "地區：" + officeMap.get(district) + "\n";
    text += "狀態：" + (quota == "R" ? "一般服務時段 " : "延長服務時段 ") +
        (quota_amount == "g" ? "尚有名額" : "少量名額") + "\n";
    console.log(text);

    var data = {
        service_id: api_data.service_id,
        template_id: api_data.template_id,
        user_id: api_data.user_id,
        template_params: {
            'date': date.toLocaleDateString("zh-HK"),
            'district': officeMap.get(district),
            'quota_type': quota == "R" ? "一般服務時段 " : "延長服務時段 ",
            'quota_amount': quota_amount == "g" ? "尚有名額" : "少量名額"
        },
        accessToken: api_data.accessToken
    };

    var xmlHttp = new xmlHttpRequest();   // new HttpRequest instance 
    xmlHttp.open("POST", "https://api.emailjs.com/api/v1.0/email/send");
    xmlHttp.setRequestHeader("Content-Type", "application/json");
    xmlHttp.addEventListener("load", function () {
        console.log(xmlHttp.status, xmlHttp.response);
    }, false);
    xmlHttp.send(JSON.stringify(data));
}