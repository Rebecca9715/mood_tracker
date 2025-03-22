const checkLogin = () => {
  const userInfo = wx.getStorageSync('userInfo')
  return userInfo && userInfo.nickName // 只要有用户信息就认为已登录
}

const redirectToLogin = () => {
  const currentPages = getCurrentPages()
  const currentPage = currentPages[currentPages.length - 1]
  
  // 如果当前已经在登录页，则不要重复跳转
  if (currentPage && currentPage.route === 'pages/login/login') {
    return
  }
  
  wx.navigateTo({
    url: '/pages/login/login'
  })
}

module.exports = {
  checkLogin,
  redirectToLogin
}