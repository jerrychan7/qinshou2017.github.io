function setCookie(cname, cvalue, exdays) {
    exdays = exdays || 3650;
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    console.log(cname + "=" + cvalue);
}
function getCookie(cname) {
    var name = cname + "=",
        ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
         }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
         }
    }
    return "";
}
function delCookie(cname) {
    setCookie(cname, "", -1);
}

function retheme(theme) {
    var cn = document.body.className,
        allTheme = ("default,darktheme"/*allTheme*/).split(",");
    var now = 0;
    for (var i = 0; i < allTheme.length; ++i)
        if (cn.indexOf(allTheme[i]) > -1) {
            now = i;
            break;
        }
    console.log({now, theme, i: allTheme.indexOf(theme)});
    document.body.className = cn.replace(allTheme[now], "").replace(/(\s)\1*/, "$1").trim();
    if (theme !== undefined && allTheme.indexOf(theme) > -1) {
        if(allTheme.indexOf(theme)) {
            document.body.className = (cn + " " + theme).trim();
            setCookie("theme", theme);
        }
    }
    else if (now != allTheme.length - 1) {
        document.body.className = (cn + " " + allTheme[(now + 1) % allTheme.length]).trim();
        if(allTheme.indexOf(theme)) setCookie("theme", allTheme[(now + 1) % allTheme.length]);
    }
}

window.addEventListener("load", function(e) {
    retheme(getCookie("theme") || "default");
});
