
window.addEventListener("load", () => {
  // 滚动条到页面顶部的水平和垂直距离
  const getTopDistance = () => ({
    x: Math.max(document.documentElement?.scrollLeft || 0, document.body?.scrollLeft || 0, window.scrollX || 0),
    y: Math.max(document.documentElement?.scrollTop || 0, document.body?.scrollTop || 0, window.scrollY || 0)
  });
  const atTheTop = ({x, y} = getTopDistance()) => x <= 0 && y <= 0;
  const goTop = (acceleration = 0.1, time = 16) => {
    let dis = getTopDistance(), {x, y} = dis;
    // 如果距离不为零, 继续调用迭代本函数
    if (atTheTop(dis)) return;
    // 滚动距离 = 目前距离 / 速度, 因为距离原来越小, 速度是大于 1 的数, 所以滚动距离会越来越小
    let speed = 1 + acceleration;
    if (x / speed <= 10) x = 0;
    if (y / speed <= 10) y = 0;
    window.scrollTo(~~(x / speed), ~~(y / speed));
    window.setTimeout(() => goTop(acceleration, time), time);
  };

  const backToTopBtn = document.createElement("a");
  backToTopBtn.href = "#head";
  backToTopBtn.id = "back2top";
  backToTopBtn.innerHTML = "^<br/>TOP";
  backToTopBtn.onclick = () => goTop() && false;
  backToTopBtn.style.display = atTheTop()? "none": "block";
  window.addEventListener("scroll", () => {
    const scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
    backToTopBtn.style.display = scrollTop > 100? "block": "none";
  });
  document.body.appendChild(backToTopBtn);
});
