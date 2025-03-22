Page({
  data: {
    userInfo: null,
    isAgree: false,
    showPrivacy: false,
    privacyText: '感谢您使用心情觉察小程序！...'
  },

  // 添加转发功能
  onShareAppMessage() {
    return {
      title: '记录每一天的心情变化',
      path: '/pages/index/index',
      imageUrl: '/assets/icons/mood.png'  // 可以自定义转发图片
    }
  },

  // 添加分享到朋友圈
  onShareTimeline() {
    return {
      title: '记录每一天的心情变化',
      query: '',
      imageUrl: '/assets/icons/mood.png'
    }
  },

  onAgreeChange(e) {
    console.log('协议同意状态：', e.detail.value)
    this.setData({
      isAgree: e.detail.value.length > 0
    })
  },

  showPrivacyPolicy() {
    this.setData({
      showPrivacy: true
    })
  },

  closePrivacy() {
    this.setData({
      showPrivacy: false
    })
  },

  getUserProfile() {
    if (!this.data.isAgree) {
      console.log('用户未同意协议')
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      })
      return
    }

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功：', res)
        const userInfo = res.userInfo
        const fullUserInfo = {
          ...res.userInfo,
          encryptedData: res.encryptedData,
          iv: res.iv,
          signature: res.signature
        }
        wx.setStorageSync('userInfo', fullUserInfo)
        this.setData({
          userInfo: userInfo
        })
        
        this.doLogin()
      },
      fail: (err) => {
        console.error('获取用户信息失败，错误详情：', err)
        wx.showToast({
          title: '登录失败：' + (err.errMsg || '未知错误'),
          icon: 'none'
        })
      }
    })
  },

  doLogin() {
    wx.showLoading({
      title: '登录中...'
    })

    wx.login({
      success: (loginRes) => {
        console.log('wx.login 成功：', loginRes)
        if (loginRes.code) {
          wx.hideLoading()
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '登录失败：未获取到授权码',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('wx.login 失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '登录失败：' + (err.errMsg || '未知错误'),
          icon: 'none'
        })
      }
    })
  }
})