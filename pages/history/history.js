const auth = require('../../utils/auth.js')

Page({
  data: {
    records: []
  },

  onShow() {
    if (!auth.checkLogin()) {
      auth.redirectToLogin()
      return
    }
    this.loadRecords()
  },

  onHide() {
    // 页面隐藏时清空数据，避免闪烁
    this.setData({
      records: []
    })
  },

  loadRecords() {
    const records = wx.getStorageSync('moodRecords') || [];
    this.setData({
      records: records.map(record => ({
        ...record,
        formattedTime: this.formatTime(record.timestamp)
      }))
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  showDetail(e) {
    const record = e.currentTarget.dataset.record;
    wx.navigateTo({
      url: `/pages/detail/detail?record=${encodeURIComponent(JSON.stringify(record))}`,
      fail: (err) => {
        console.error('页面跳转失败：', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  deleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const records = wx.getStorageSync('moodRecords') || [];
          records.splice(index, 1);
          wx.setStorageSync('moodRecords', records);
          
          // 重新加载并格式化记录
          this.loadRecords();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
});