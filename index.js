const isPanel = () => typeof $input != 'undefined' && $input.purpose === 'panel'
const isRequest = () => typeof $request !== 'undefined'

let arg
if (typeof $argument != 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

if (/^\d+$/.test(arg?.TIMEOUT)) {
  console.log(`thông số thời gian chờ ${arg?.TIMEOUT} giây`)
  setTimeout(() => {
    console.log(`Thời gian trễ ${arg?.TIMEOUT - 1}`)
    $done({
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Thời gian trễ ${arg?.TIMEOUT - 1} giây` }),
      },
    })
  }, (arg?.TIMEOUT - 1) * 1000)
}

let DISMISS = 0
if (/^\d+$/.test(arg?.DISMISS)) {
  DISMISS = parseInt(arg?.DISMISS, 10)
}

let result = {}
!(async () => {
  if (isPanel()) {
    // console.log($input)
    // console.log($trigger)
    if ($trigger === 'button') {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      // console.log(requests.map(i => i.URL))
      // for await (const { id } of requests) {
      //   // console.log(id)
      //   const res = await httpAPI('/v1/requests/kill', 'POST', { id })
      //   // console.log(res)
      // }
      await kill()
      $notification.post('Bảng kích hoạt', 'yêu cầu ngưng', `🅰 Số yêu cầu đang hoạt động: ${requests.length}`, { 'auto-dismiss': DISMISS })
    }
    // await delay(1000)
    const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
    // console.log(requests.map(i => i.URL))
    result = { title: `Số yêu cầu đang hoạt động: ${requests.length}`, content: 'Nhấp vào nút ngắt', ...arg }
  } else if (isRequest()) {
    const params = parseQueryString($request.url)
    if (params?.REQ_RULE) {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      let count = 0
      for await (const { id, rule, url, URL } of requests) {
        const re = new RegExp(params?.REQ_RULE)
        if (re.test(rule)) {
          console.log(`🅁 ${url || URL}, ${rule} Quy tắc phù hợp ${params?.REQ_RULE}`)
          count++
          await httpAPI('/v1/requests/kill', 'POST', { id })
        }
      }
      if (arg?.REQ_NOTIFY == 1) {
        $notification.post('Xin kích hoạt', '', `🅰 Số yêu cầu đang hoạt động: ${requests.length}\n🅂 Số yêu cầu ngắt: ${count}`, { 'auto-dismiss': DISMISS })
      }
      result = {
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count, rule: params?.REQ_RULE }),
        },
      }
    } else {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      await kill()
      if (arg?.REQ_NOTIFY == 1) {
        $notification.post('Xin kích hoạt', 'yêu cầu ngưng', `🅰 Số yêu cầu đang hoạt động: ${requests.length}`, { 'auto-dismiss': DISMISS })
      }
      result = {
        response: {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
          body: `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>
          window.onload = () => {
            const btn = document.getElementById("btn");
            btn.disabled = true;
            btn.innerHTML = "Tải lại...";
            setTimeout(function() {
              btn.disabled = false;
              btn.innerHTML = "làm mới ";
            }, 1000);
          }
      </script></head><body><h1>Tìm thấy ${requests.length} Một yêu cầu đang hoạt động</h1><h2>Đã cố gắng ngắt kết nối</h2><button id="btn" onclick="location.reload()">làm mới </button></body></html>`,
        },
      }
    }
  } else if (arg?.TYPE == 'CRON' && arg?.CRON_RULE) {
    const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
    let count = 0
    for await (const { id, rule, url, URL } of requests) {
      const re = new RegExp(arg?.CRON_RULE)
      if (re.test(rule)) {
        console.log(`🅁 ${url || URL}, ${rule} Quy tắc phù hợp ${arg?.CRON_RULE}`)
        count++
        await httpAPI('/v1/requests/kill', 'POST', { id })
      }
    }
    if (arg?.CRON_NOTIFY == 1) {
      $notification.post('Nhiệm vụ theo thời gian', '', `🅰 Số yêu cầu đang hoạt động: ${requests.length}\n🅂 Số yêu cầu ngắt: ${count}`, { 'auto-dismiss': DISMISS })
    }
  } else {
    // console.log(JSON.stringify($network, null, 2))
    let wifi = $network.wifi && $network.wifi.bssid
    if (wifi) {
      // console.log(`Bây giờ có wifi`)
      $persistentStore.write(wifi, 'last_network')
    } else {
      // console.log(`Không có wifi`)
      wifi = $persistentStore.read('last_network')
      // console.log(`Nhưng trước đó có wifi`)
      if (wifi) {
        const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
        // for await (const { id } of requests) {
        //   // console.log(id)
        //   const res = await httpAPI('/v1/requests/kill', 'POST', { id })
        //   // console.log(res)
        // }
        await kill()
        if (arg?.EVENT_NOTIFY == 1) {
          $notification.post('Thay đổi mạng', 'yêu cầu ngưng', `🅰 Số yêu cầu đang hoạt động: ${requests.length}`, { 'auto-dismiss': DISMISS })
        }
      }
      $persistentStore.write('', 'last_network')
    }
  }
})()
  .catch(e => {
    console.log(e)
    const msg = `${e.message || e}`
    if (isPanel()) {
      result = { title: '❌', content: msg, ...arg }
    } else if (isRequest()) {
      result = {
        response: {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: msg }),
        },
      }
    } else {
      $notification.post('Thay đổi mạng', `❌ yêu cầu ngưng`, msg, { 'auto-dismiss': DISMISS })
    }
  })
  .finally(() => $done(result))

async function kill() {
  await httpAPI('/v1/dns/flush', 'POST')
  // Quy tắc xuất hiện ban đầu
  const beforeMode = (await httpAPI('/v1/outbound', 'GET')).mode
  console.log(`Quy định hiện hành: ${beforeMode}`)
  const newMode = { direct: 'proxy', proxy: 'direct', rule: 'proxy' }
  // Chuyển đổi các trạm sử dụng surge để giết tất cả các kết nối đang hoạt động
  console.log(`Chuyển đổi: ${newMode[beforeMode]}`)
  await httpAPI('/v1/outbound', 'POST', { mode: `${newMode[beforeMode]}` })
  await httpAPI('/v1/outbound', 'POST', { mode: `${newMode[newMode[beforeMode]]}` })
  console.log(`Chuyển đổi: ${newMode[newMode[beforeMode]]}`)
  // Chuyển đổi quy tắc xuất cảnh ban đầu
  console.log(`Chuyển đổi địa điểm: ${beforeMode}`)
  await httpAPI('/v1/outbound', 'POST', { mode: `${beforeMode}` })
  if ((await httpAPI('/v1/outbound', 'GET')).mode != beforeMode) {
    console.log(`Cắt lại: ${beforeMode}`)
    await httpAPI('/v1/outbound', 'POST', { mode: `${beforeMode}` })
  }
}
function httpAPI(path = '', method = 'POST', body = null) {
  return new Promise(resolve => {
    $httpAPI(method, path, body, result => {
      resolve(result)
    })
  })
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
// Các tham số phù hợp với logic của các kịch bản khác
function parseQueryString(url) {
  const queryString = url.split('?')[1] // Nhận phần chuỗi truy vấn
  const regex = /([^=&]+)=([^&]*)/g // Biểu thức chính cho cặp giá trị khóa
  const params = {}
  let match

  while ((match = regex.exec(queryString))) {
    const key = decodeURIComponent(match[1]) // Khóa giải mã
    const value = decodeURIComponent(match[2]) // Giải mã
    params[key] = value // Thêm cặp giá trị khóa vào đối tượng
  }

  return params
}
