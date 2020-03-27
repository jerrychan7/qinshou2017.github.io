
window.addEventListener("load", function(e) {
    var a = document.createElement("a");
    a.href = "#head";
    a.id = "gotoTop";
    a.onclick = function (e) {
        goTop();
        return false;
    };
    a.innerHTML = "^";
    a.style.display = atTheTop()? "none": "block";
    document.body.appendChild(a);
    
    window.addEventListener("scroll", function() {
        var scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop,
            display = "none";
        if (scrollTop > 100) display = "block";
        document.getElementById("gotoTop").style.display = display;
    });
    
    // 滚动条到页面顶部的水平和垂直距离
    function getTopDistance() {
        var x1 = 0, y1 = 0,
            x2 = 0, y2 = 0,
            x3 = window.scrollX || 0,
            y3 = window.scrollY || 0;
        if (document.documentElement) {
            x1 = document.documentElement.scrollLeft || 0;
            y1 = document.documentElement.scrollTop || 0;
        }
        if (document.body) {
            x2 = document.body.scrollLeft || 0;
            y2 = document.body.scrollTop || 0;
        }
        return {
            x: Math.max(x1, Math.max(x2, x3)),
            y: Math.max(y1, Math.max(y2, y3))
        };
    }
    
    function atTheTop() {
        var dis = getTopDistance();
        return dis.x <= 0 && dis.y <= 0;
    }

    function goTop(acceleration, time) {
        var dis = getTopDistance(), x = dis.x, y = dis.y;
        // 如果距离不为零, 继续调用迭代本函数
        if (x <= 0 && y <= 0) return;
        acceleration = acceleration || 0.1;
        time = time || 16;
        // 滚动距离 = 目前距离 / 速度, 因为距离原来越小, 速度是大于 1 的数, 所以滚动距离会越来越小
        var speed = 1 + acceleration;
        if (x / speed <= 10) x = 0;
        if (y / speed <= 10) y = 0;
        window.scrollTo(Math.floor(x / speed), Math.floor(y / speed));
        // window.setTimeout("goTop(" + acceleration + ", " + time + ")", time);
        window.setTimeout(function() {
            goTop(acceleration, time);
        }, time);
    };
});
