var inp = document.getElementById("prmpt")
var ak = document.getElementById("api_k")
var bt = document.getElementById("btn_save")
var tp_name = document.getElementById("tp_name")
var btn_add = document.getElementById("btn_add_tp")
var tpl_cont = document.getElementById("tpl_cont")
var ws = document.getElementById("wait_screen")
var mc = document.getElementById("main_cont")
var ud = document.getElementById("uid_display")
var sc_list = document.getElementById("sc_list")
var btn_sc = document.getElementById("btn_open_sc")

var user_tpls = []


function load_shorcuts(){
    if(!chrome.commands) return
    chrome.commands.getAll(function(cmds){
        sc_list.innerHTML = ""
        for(var c of cmds){
            if(!c.name || c.name === "_execute_action") continue
            var row = document.createElement("div")
            row.className = "sc-row"

            var nm = document.createElement("span")
            nm.className = "sc-name"
            nm.innerText = c.description || c.name

            var ky = document.createElement("span")
            ky.className = "sc-key"
            ky.innerText = c.shortcut || "not set"

            row.appendChild(nm)
            row.appendChild(ky)
            sc_list.appendChild(row)
        }
    })
}
load_shorcuts()

if(btn_sc){
    btn_sc.onclick = function(){
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" })

    }
}



async function init_user() {
    var { userid } = await chrome.storage.local.get('userid')
    if (!userid) {
        userid = 'u' + Math.random().toString(36).substr(2, 9)
        await chrome.storage.local.set({ userid: userid })
    }
    if (ud) ud.innerText = "ID: " + userid
}
init_user()

if (ws) ws.style.display = "none"
if (mc) mc.style.display = "flex"



function render_tpls() {
    tpl_cont.innerHTML = ""

    for (let i = 0; i < user_tpls.length; i++) {
        let item = document.createElement("div")
        item.className = "tp-item"

        let b = document.createElement("button")
        b.className = "tp-btn"
        b.innerText = user_tpls[i].name
        b.onclick = function () {
            inp.value = user_tpls[i].text
        }

        let del = document.createElement("button")
        del.className = "del-tp"
        del.innerText = "X"
        del.onclick = function () {
            user_tpls.splice(i, 1)
            save_tpls()
            render_tpls()
        }

        item.appendChild(b)
        item.appendChild(del)
        tpl_cont.appendChild(item)
    }
}

function save_tpls() {
    chrome.storage.local.set({ "user_presets": user_tpls })
}

chrome.storage.local.get(['custom_prmpt', 'user_presets', 'api_key_val'], async function (res) {
    if (res.custom_prmpt) {
        inp.value = res.custom_prmpt
    }
    if (res.api_key_val) {
        ak.value = res.api_key_val
    } else {
        try {
            var e_f = await fetch('./.env')
            var e_t = await e_f.text()
            var fnd = e_t.match(/GROQ_API_KEY=(.*)/)
            if (fnd) ak.value = fnd[1].trim()
        } catch (e) {
            console.log("couldnt grab env bro: " + e)
        }
    }

    if (res.user_presets) {
        user_tpls = res.user_presets
        render_tpls()
    }
})


bt.onclick = function () {
    var vall = inp.value
    var kv = ak.value
    chrome.storage.local.set({ "custom_prmpt": vall, "api_key_val": kv }, function () {
        console.log("saved!");
    })
}

btn_add.onclick = function () {
    var name = tp_name.value
    var txt = inp.value

    if (name && txt) {
        user_tpls.push({ name: name, text: txt })
        tp_name.value = ""
        save_tpls()
        render_tpls()
    }
}

document.addEventListener("mousedown", function (e) {
    let target = e.target.closest("button, summary")
    if (!target) return

    let circle = document.createElement("span")
    let d = Math.max(target.clientWidth, target.clientHeight)
    let rect = target.getBoundingClientRect()

    circle.style.width = circle.style.height = d + "px"
    circle.style.left = e.clientX - rect.left - d / 2 + "px"
    circle.style.top = e.clientY - rect.top - d / 2 + "px"
    circle.className = "ripple"

    let clr = window.getComputedStyle(target).color;
    circle.style.backgroundColor = clr.replace(')', ', 0.2)').replace('rgb', 'rgba');

    let old = target.querySelector(".ripple")
    if (old) old.remove()

    target.appendChild(circle)

    setTimeout(() => {
        circle.remove()
    }, 600)
})
