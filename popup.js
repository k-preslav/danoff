var inp = document.getElementById("prmpt")
var bt = document.getElementById("btn_save")
var tp_name = document.getElementById("tp_name")
var btn_add = document.getElementById("btn_add_tp")
var tpl_cont = document.getElementById("tpl_cont")
var ws = document.getElementById("wait_screen")
var mc = document.getElementById("main_cont")
var ud = document.getElementById("uid_display")

var user_tpls = []

async function check_status() {
    var { userid } = await chrome.storage.local.get('userid')
    if (!userid) {
        userid = 'u' + Math.random().toString(36).substr(2, 9)
        await chrome.storage.local.set({ userid: userid })
    }

    ud.innerText = "ID: " + userid

    try {
        const r = await fetch(`https://bgtulk.dev/danof/admin.php?check=${userid}`)
        const d = await r.json()
        if (d.allowed) {
            ws.style.display = "none"
            mc.style.display = "flex"
        } else {
            ws.style.display = "flex"
            mc.style.display = "none"
        }
    } catch (e) {
        console.log("fetch err")
        ws.style.display = "flex"
        mc.style.display = "none"
    }
}

check_status()


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

chrome.storage.local.get(['custom_prmpt', 'user_presets'], function (res) {
    if (res.custom_prmpt) {
        inp.value = res.custom_prmpt
    }
    if (res.user_presets) {
        user_tpls = res.user_presets
        render_tpls()
    }
})


bt.onclick = function () {
    var vall = inp.value
    chrome.storage.local.set({ "custom_prmpt": vall }, function () {
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
