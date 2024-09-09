
function getThemeColorFromCss(sss = document.styleSheets) {
  for (var i = 0; i < sss.length; ++i) {
    var ss = sss[i], cr = ss.cssRules;
    if (!cr) continue;
    for (var j = 0; j < cr.length; ++j) {
      var csr = cr[j];
      if ("href" in csr) {
        getThemeColor([csr.styleSheet]);
        continue;
      }
      var st = csr.selectorText;
      if (st?.indexOf("meta-theme-color") > -1) {
        let color = csr.style.color;
        if (color.startsWith("var"))
          color = getComputedStyle(document.documentElement)
            .getPropertyValue(color.replace(/var\(\s*(\S+)\s*\)/, "$1"));
        return color;
      }
    }
  }
}

function updateMetaThemeColor(color = getThemeColorFromCss()) {
  const meta = document.querySelector("meta[name=\"theme-color\"]");
  if (meta) meta.content = color;
  window.cookie.set("themeColor", color);
}

// const themeMedia = window.matchMedia("(prefers-color-scheme: light)");
// themeMedia.addEventListener("change", e => {
//   if (e.matches) {
//     console.log("light");
//   } else {
//     console.log("dark");
//   }
// });

function retheme(theme) {
  // const allTheme = ("/*allTheme*/").indexOf("/*") != -1
  //   ? ("/*allTheme*/").split(",")
  //   : ("default,darktheme").split(",");
  // let currentTheme = window.cookie.get("theme", "default");
  const allTheme = ["dark", "light"];
  let currentTheme = window.cookie.get("theme", "light");
  let nextTheme = theme || allTheme[(allTheme.indexOf(currentTheme) + 1) % allTheme.length];
  window.cookie.set("theme", nextTheme);
  const link = document.querySelector("#theme"), img = document.createElement("img");
  img.onerror = () => setTimeout(updateMetaThemeColor, 10);
  img.src = link.href = `/css/theme/${nextTheme}.css`;
  const changeThemeBtn = document.getElementById("changeTheme");
  if (changeThemeBtn) changeThemeBtn.className = { auto: "auto", dark: "moon", light: "sun" }[nextTheme];
}

window.addEventListener("load", () => {
  // image
  // todo: resize
  var imgs = document.getElementsByTagName("img");
  for (var i = 0; i < imgs.length; ++i) {
    var img = imgs[i],
      p = img.parentElement;
    if (img.width <= p.clientWidth)
      continue;
    if (img.width <= p.clientWidth + 100) {
      img.style.width = "100%";
    }
    else {
      var div = document.createElement("div");
      div.style.overflow = "auto";
      div.innerHTML = img.outerHTML;
      p.insertBefore(div, img);
      p.removeChild(img);
    }
  }

  // hyperlink
  var links = document.getElementsByTagName("a");
  for (var i = 0; i < links.length; ++i) {
    var a = links[i],
      src = a.href;
    if (src.length === 0) continue;
    if (("./#?").indexOf(src[0]) > -1)
      continue;
    if (src.indexOf(document.location.host) > -1)
      continue;
    if (src.match(/^javascript/i))
      continue;
    a.target = "_blank";
  }

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
  const backToTopBtn = document.getElementById("back2top");
  backToTopBtn.onclick = () => goTop() && false;
  backToTopBtn.style.display = atTheTop()? "none": "block";
  window.addEventListener("scroll", () => {
    const scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
    backToTopBtn.style.display = scrollTop > 100? "block": "none";
  });

  const changeThemeBtn = document.getElementById("changeTheme");
  if (changeThemeBtn) {
    changeThemeBtn.onclick = () => retheme();
    changeThemeBtn.className = { auto: "auto", dark: "moon", light: "sun" }[window.cookie.get("theme", "light")];
    changeThemeBtn.innerHTML = `<!-- https://www.svgrepo.com/svg/44458/moon -->
      <svg class="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" transfrom="scale(-1, 1)" stroke="currentColor" stroke-width="15">
        <path d="m275.4,500.7c-135,0-244.7-109.8-244.7-244.7 1.06581e-14-134.9 109.8-244.7 244.7-244.7 8.2,0 16.4,0.4 24.6,1.2 7.2,0.7 13.5,5.2 16.5,11.7s2.4,14.2-1.6,20.2c-23,33.8-35.2,73.3-35.2,114.2 0,105 78.7,192.2 183.2,202.6 7.2,0.7 13.5,5.2 16.5,11.7 3.1,6.5 2.4,14.2-1.6,20.2-45.8,67.4-121.4,107.6-202.4,107.6zm-12.5-448c-106.5,6.5-191.2,95.2-191.2,203.3 1.42109e-14,112.3 91.4,203.7 203.7,203.7 56.4,0 109.6-23.4 147.8-63.7-46.2-11.7-88.1-36.8-120.8-72.6-41.1-45.2-63.8-103.6-63.8-164.6 0.1-37.1 8.4-73.2 24.3-106.1z"/>
      </svg>
      <!-- https://www.svgrepo.com/svg/4794/sun -->
      <svg class="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="m256,102.2c-84.8,0-153.8,69-153.8,153.8 0,84.8 69,153.8 153.8,153.8 84.8,0 153.8-69 153.8-153.8 0-84.8-69-153.8-153.8-153.8zm0,266.8c-62.3,0-113-50.7-113-113 0-62.3 50.7-113 113-113 62.3,0 113,50.7 113,113 0,62.3-50.7,113-113,113z"/>
        <path d="m59.8,235.6h-28.4c-11.3,0-20.4,9.1-20.4,20.4s9.1,20.4 20.4,20.4h28.4c11.3,0 20.4-9.1 20.4-20.4s-9.1-20.4-20.4-20.4z"/>
        <path d="m480.6,235.6h-28.4c-11.3,0-20.4,9.1-20.4,20.4s9.1,20.4 20.4,20.4h28.4c11.3,0 20.4-9.1 20.4-20.4s-9.1-20.4-20.4-20.4z"/>
        <path d="M256,80.2c11.3,0,20.4-9.1,20.4-20.4V31.4c0-11.3-9.1-20.4-20.4-20.4s-20.4,9.1-20.4,20.4v28.4 C235.6,71.1,244.7,80.2,256,80.2z"/>
        <path d="m256,431.8c-11.3,0-20.4,9.1-20.4,20.4v28.4c0,11.3 9.1,20.4 20.4,20.4s20.4-9.1 20.4-20.4v-28.4c0-11.3-9.1-20.4-20.4-20.4z"/>
        <path d="m102.8,131.7c8,8 20.9,8 28.8,0 8-8 8-20.9 0-28.8l-20.1-20.1c-8-8-20.9-8-28.8,0s-8,20.9 0,28.8l20.1,20.1z"/>
        <path d="m409.2,380.3c-8-8-20.9-8-28.8,0-8,8-8,20.9 0,28.8l20.1,20.1c8,8 20.9,8 28.8,0 8-8 8-20.9 0-28.8l-20.1-20.1z"/>
        <path d="m409.2,131.7l20.1-20.1c8-8 8-20.9 0-28.8-8-8-20.9-8-28.8,0l-20.1,20.1c-8,8-8,20.9 0,28.8 7.9,8 20.8,8 28.8-2.84217e-14z"/>
        <path d="m102.8,380.3l-20.1,20.1c-8,8-8,20.9 0,28.8 8,8 20.9,8 28.8,0l20.1-20.1c8-8 8-20.9 0-28.8-7.9-8-20.8-8-28.8,0z"/>
        <path d="m289.7,270.3c-36.9,21.6-65.3,2.2-66.9,1.1-9-6.6-21.7-4.7-28.4,4.3-6.7,9-4.9,21.8 4.1,28.5 1.4,1 23.5,17.1 56.2,17.1 16.3,0 35.2-4 55.5-15.9 9.7-5.7 13-18.2 7.3-27.9-5.6-9.6-18.1-12.9-27.8-7.2z"/>
        <circle cx="212" cy="211.1" r="20.5"/>
        <circle cx="300" cy="211.1" r="20.5"/>
      </svg>
      <svg class="auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.8"/>
        <mask id="a" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor" stroke="currentColor" stroke-width="1.8"/>
        </mask>
        <g mask="url(#a)"><path fill="currentColor" d="M0 0h8v16H0z"/></g>
      </svg>`;
  }
});
