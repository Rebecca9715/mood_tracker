Page({
  data: {
    selectedMood: '',
    notes: ''
  },

  selectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({ selectedMood: mood });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  submitMoodRecord() {
    if (!this.data.selectedMood) {
      wx.showToast({
        title: '请选择心情',
        icon: 'none'
      });
      return;
    }

    const record = {
      mood: this.data.selectedMood,
      notes: this.data.notes,
      timestamp: new Date().getTime()
    };

    const records = wx.getStorageSync('moodRecords') || [];
    records.unshift(record);
    wx.setStorageSync('moodRecords', records);

    wx.showToast({
      title: '记录成功',
      icon: 'success',
      success: () => {
        this.setData({
          selectedMood: '',
          notes: ''
        });
      }
    });
  }
});