const browserApi = globalThis.browser || globalThis.chrome

function storageGet(keys) {
    const result = browserApi.storage.local.get(keys)
    return result && typeof result.then === "function"
        ? result
        : new Promise((resolve) => browserApi.storage.local.get(keys, resolve))
}

function storageSet(values) {
    const result = browserApi.storage.local.set(values)
    return result && typeof result.then === "function"
        ? result
        : new Promise((resolve) => browserApi.storage.local.set(values, resolve))
}

function commandsGetAll() {
    const result = browserApi.commands.getAll()
    return result && typeof result.then === "function"
        ? result
        : new Promise((resolve) => browserApi.commands.getAll(resolve))
}

function runtimeSendMessage(message) {
    const result = browserApi.runtime.sendMessage(message)
    return result && typeof result.then === "function"
        ? result
        : new Promise((resolve) => browserApi.runtime.sendMessage(message, resolve))
}

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
var chk_screenshot = document.getElementById("chk_screenshot")
var chk_autotext = document.getElementById("chk_autotext")
var sel_vm = document.getElementById("sel_vision_model")
var inp_cvm = document.getElementById("custom_vision_model")
var sel_tm = document.getElementById("sel_text_model")
var inp_ctm = document.getElementById("custom_text_model")
var btn_rfm = document.getElementById("btn_refresh_models")
var st_models = document.getElementById("models_status")

var user_tpls = []

function load_shorcuts() {
    if (!browserApi.commands) return
    commandsGetAll().then(function (cmds) {
        sc_list.innerHTML = ""
        for (var c of cmds) {
            if (!c.name || c.name === "_execute_action") continue
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

if (btn_sc) {
    btn_sc.onclick = function () {
        if (typeof browser !== "undefined") {
            browserApi.tabs.create({ url: "https://support.mozilla.org/kb/manage-extension-shortcuts-firefox" })
        } else {
            browserApi.tabs.create({ url: "chrome://extensions/shortcuts" })
        }
    }
}

async function init_user() {
    var { userid } = await storageGet('userid')
    if (!userid) {
        userid = 'u' + Math.random().toString(36).substr(2, 9)
        await storageSet({ userid: userid })
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
    storageSet({ "user_presets": user_tpls })
}

function populateModelSelects(cached, userVision, userText, workingVision, workingText) {
    const visionModels = (cached && Array.isArray(cached.vision) && cached.vision.length)
        ? cached.vision
        : ["qwen/qwen3.8-27b", "meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]

    const textModels = (cached && Array.isArray(cached.text) && cached.text.length)
        ? cached.text
        : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"]

    if (sel_vm) {
        sel_vm.innerHTML = ""
        const optVAuto = document.createElement("option")
        optVAuto.value = "auto"
        optVAuto.innerText = "Auto-detect" + (workingVision ? " (" + workingVision + ")" : "")
        sel_vm.appendChild(optVAuto)

        for (const m of visionModels) {
            const opt = document.createElement("option")
            opt.value = m
            opt.innerText = m
            sel_vm.appendChild(opt)
        }

        const optVCustom = document.createElement("option")
        optVCustom.value = "custom"
        optVCustom.innerText = "Custom model..."
        sel_vm.appendChild(optVCustom)

        if (userVision && userVision !== "auto") {
            if (visionModels.includes(userVision)) {
                sel_vm.value = userVision
                if (inp_cvm) inp_cvm.style.display = "none"
            } else {
                sel_vm.value = "custom"
                if (inp_cvm) {
                    inp_cvm.value = userVision
                    inp_cvm.style.display = "block"
                }
            }
        } else {
            sel_vm.value = "auto"
            if (inp_cvm) inp_cvm.style.display = "none"
        }
    }

    if (sel_tm) {
        sel_tm.innerHTML = ""
        const optTAuto = document.createElement("option")
        optTAuto.value = "auto"
        optTAuto.innerText = "Auto-detect" + (workingText ? " (" + workingText + ")" : "")
        sel_tm.appendChild(optTAuto)

        for (const m of textModels) {
            const opt = document.createElement("option")
            opt.value = m
            opt.innerText = m
            sel_tm.appendChild(opt)
        }

        const optTCustom = document.createElement("option")
        optTCustom.value = "custom"
        optTCustom.innerText = "Custom model..."
        sel_tm.appendChild(optTCustom)

        if (userText && userText !== "auto") {
            if (textModels.includes(userText)) {
                sel_tm.value = userText
                if (inp_ctm) inp_ctm.style.display = "none"
            } else {
                sel_tm.value = "custom"
                if (inp_ctm) {
                    inp_ctm.value = userText
                    inp_ctm.style.display = "block"
                }
            }
        } else {
            sel_tm.value = "auto"
            if (inp_ctm) inp_ctm.style.display = "none"
        }
    }
}

if (sel_vm) {
    sel_vm.onchange = function () {
        if (inp_cvm) inp_cvm.style.display = sel_vm.value === "custom" ? "block" : "none"
    }
}

if (sel_tm) {
    sel_tm.onchange = function () {
        if (inp_ctm) inp_ctm.style.display = sel_tm.value === "custom" ? "block" : "none"
    }
}

if (btn_rfm) {
    btn_rfm.onclick = function () {
        if (st_models) st_models.innerText = "checking models from Groq..."
        runtimeSendMessage({ action: "refresh-models" }).then(function (res) {
            if (res && res.all && res.all.length) {
                if (st_models) st_models.innerText = res.text.length + " text, " + res.vision.length + " vision models active"
                storageGet(['user_vision_model', 'user_text_model', 'working_vision_model', 'working_text_model']).then(function (d) {
                    populateModelSelects(res, d.user_vision_model, d.user_text_model, d.working_vision_model, d.working_text_model)
                })
            } else {
                if (st_models) st_models.innerText = "could not load models (check key)"
            }
        })
    }
}

storageGet([
    'custom_prmpt',
    'user_presets',
    'api_key_val',
    'screenshot_enabled',
    'autotext_enabled',
    'user_vision_model',
    'user_text_model',
    'cached_models',
    'working_vision_model',
    'working_text_model'
]).then(async function (res) {
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

    if (res.screenshot_enabled !== undefined) {
        chk_screenshot.checked = res.screenshot_enabled
    }

    if (res.autotext_enabled !== undefined && chk_autotext) {
        chk_autotext.checked = res.autotext_enabled
    }

    if (res.user_presets) {
        user_tpls = res.user_presets
        render_tpls()
    }

    populateModelSelects(
        res.cached_models,
        res.user_vision_model,
        res.user_text_model,
        res.working_vision_model,
        res.working_text_model
    )

    if (ak.value && (!res.cached_models || !res.cached_models.all || !res.cached_models.all.length)) {
        runtimeSendMessage({ action: "refresh-models" }).then(function (fresh) {
            if (fresh && fresh.all) {
                populateModelSelects(fresh, res.user_vision_model, res.user_text_model, res.working_vision_model, res.working_text_model)
            }
        })
    }
})

bt.onclick = function () {
    var vall = inp.value
    var kv = ak.value
    var se = chk_screenshot.checked
    var ate = chk_autotext ? chk_autotext.checked : false
    var uvm = (sel_vm && sel_vm.value === "custom" && inp_cvm) ? inp_cvm.value.trim() : (sel_vm ? sel_vm.value : "auto")
    var utm = (sel_tm && sel_tm.value === "custom" && inp_ctm) ? inp_ctm.value.trim() : (sel_tm ? sel_tm.value : "auto")

    storageSet({
        "custom_prmpt": vall,
        "api_key_val": kv,
        "screenshot_enabled": se,
        "autotext_enabled": ate,
        "user_vision_model": uvm,
        "user_text_model": utm
    }, function () {
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
