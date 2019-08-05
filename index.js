console.log("index test");

function retheme() {
    var cn = document.body.className;
    if (cn.indexOf("darktheme") > -1) {
        document.body.className = cn.replace("darktheme", "").replace(/(\s)\1*/, "$1").trim();
    }
    else {
        document.body.className += (cn.length? " ": "") + "darktheme";
    }
}
