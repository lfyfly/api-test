class ApiTest {
  constructor({ title, baseUrl, baseMethod, baseParams, requestList=[], requestFields = [], responesFields = [], axiosConfig = {}}) {
    if (!axios) throw '依赖 axios'
    if (!requestList) throw 'requestList 未配置'

    this.title = title
    this.baseUrl = baseUrl
    this.baseMethod = baseMethod
    this.baseParams = baseParams  // 所有请求都会带上的参数，如token
    this.requestFields = requestFields // 请求参数的字段
    this.responesFields = responesFields // 响应的字段

    // res.data[prop]
    this.requestList = requestList
    this.responseList = []  // {res, status, code, message, data}
    this.axios = axios.create(axiosConfig) // {res, status, code, message, data}
  }

  run() {
    let _this = this
    const requestTasks = _this.requestList
      .map(requestItem => {
        return function () {
          return _this.request(requestItem)
        }
      })
    return _this.queue(requestTasks).then(resList => {
      this.createResponseList(resList)
      console.log('queue end ResponseList: ', this.responseList)
    })
  }

  createResponseList(resList) {
    this.responseList = resList.map(resItem => {
      let newResItem = {}
      this.responesFields.forEach(field => {
        newResItem[field] = eval(`resItem.${field}`)
      })
      return {...resItem.config.params,...resItem.config.data, ...newResItem,_response: resItem}
    })
  }

  // 通过表头构建表格，对单一接口测试时
  renderTable() {
    return this.createTableHtml([...this.requestFields, ...this.responesFields], this.responseList)
  }
  createTableHtml(tableHeader, tableData) {

    console.log({tableData})
    let thead = `<thead><tr><td>索引</td>${tableHeader.map(field => `<td>${field}</td>`).join('')}</tr></thead>`
    let tbody = `<tbody>
      ${tableData.map((trData, index) => `<tr data-index="${index}"><td>${index}</td>${tableHeader.map(field =>`<td>${JSON.stringify(trData[field]) || ''}</td>`).join('')}<tr>`).join('')}
    </tbody>`
    let tableHtml = `<table border cellspacing="0">${thead}${tbody}</table>`
    return tableHtml
  }

  // 每个请求单独渲染
  renderRequestList(tableHeader, tableData) {
  }
  //  异步任务列队执行
  queue(requestTasks) {
    let resArr = []
    let sequence = Promise.resolve()
    requestTasks.forEach(function (item) {
      sequence = sequence.finally().then(function (res) {
        resArr.push(res)
        return item(res)
      })
    })
    return sequence.finally().then(res => {
      resArr.push(res)
      resArr.shift()
      return resArr
    })
  }

  request(requestItem) {
    let params = { ...this.baseParams, ...requestItem }
    delete params._url
    delete params._method
    return this._axios({
      method: requestItem._method || this.baseMethod,
      url: requestItem._url || this.baseUrl,
      params
    })
  }

  _axios({ method, url, params }) {
    if (['get', 'delete'].indexOf(method.toLowerCase()) !== -1) {
      return this.axios[method](url, { params })
    } else {
      return this.axios[method](url, params)
    }
  }
}



var api = {
  "title": "这是这个接口测试的标题",
  "baseUrl": "http://localhost:3000/json",
  "baseMethod": "get",
  "baseParams": {
    "token": "88888888"
  },
  "requestFields": ["a", "b", "c", "d"],
  "responesFields": ["status", "message", "data.code", "data.message", "data.title"],
  "requestList": [
    { "a": 1 },
    { "a": 2 },
    { "b": 1 },
    { "b": 2 },
    { "a": 1, "b": 2 },
    { "a": 2, "b": 1 }
  ]
}

var test = new ApiTest(api)

test.run().then(res => {
  document.querySelector('#table-container').innerHTML = test.renderTable()
})

window.onload = ()=>{
  document.querySelector('#table-container').addEventListener('click', (e)=>{
    let index = e.target.parentNode.getAttribute('data-index')
    if(!index) return
    console.log(`索引${index}`)
    const config = test.responseList[index]._response.config
    console.log(`${config.method} ${config.url}` )
    console.log(test.responseList[index]._response)
  })
}