const auth = require('../../utils/auth.js')

Page({
  onShow() {
    if (!auth.checkLogin()) {
      auth.redirectToLogin()
      return
    }
  },

  data: {
    selectedMood: '',
    note: '',
    aiResponse: '',
    moodTypes: {
      happy: '开心',
      sad: '难过',
      angry: '生气',
      anxious: '焦虑',
      neutral: '平静'
    },
    isPlaying: false,
    audioContext: null
  },

  onLoad() {
    // 创建音频实例
    this.audioContext = wx.createInnerAudioContext();
    this.audioContext.onPlay(() => {
      this.setData({ isPlaying: true });
    });
    this.audioContext.onPause(() => {
      this.setData({ isPlaying: false });
    });
    this.audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
    });
    this.audioContext.onError((err) => {
      console.error('音频播放错误：', err);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    });
  },

  onUnload() {
    // 页面卸载时销毁音频实例
    if (this.audioContext) {
      this.audioContext.destroy();
    }
  },

  playMusic() {
    if (!this.data.currentSong) return;
    
    if (this.data.isPlaying) {
      this.audioContext.pause();
    } else {
      wx.request({
        url: 'https://netease-cloud-music-api-teal-phi.vercel.app/search',
        method: 'GET',
        data: {
          keywords: this.data.currentSong.name + ' ' + this.data.currentSong.artist,
          limit: 1
        },
        success: async (res) => {
          if (res.data.result && res.data.result.songs && res.data.result.songs[0]) {
            const songId = res.data.result.songs[0].id;
            // 获取音乐 URL
            wx.request({
              url: `https://netease-cloud-music-api-teal-phi.vercel.app/song/url/v1`,
              method: 'GET',
              data: {
                id: songId,
                level: 'standard'
              },
              success: (urlRes) => {
                if (urlRes.data.data && urlRes.data.data[0] && urlRes.data.data[0].url) {
                  this.audioContext.src = urlRes.data.data[0].url;
                  this.audioContext.play();
                } else {
                  wx.showToast({
                    title: '暂无版权',
                    icon: 'none'
                  });
                }
              }
            });
          }
        },
        fail: () => {
          wx.showToast({
            title: '获取音乐失败',
            icon: 'none'
          });
        }
      });
    }
  },

  selectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({
      selectedMood: mood
    });
  },

  onNoteInput(e) {
    this.setData({
      note: e.detail.value
    });
  },

  submitMood() {
    if (!this.data.selectedMood) {
      wx.showToast({
        title: '请选择心情',
        icon: 'none'
      });
      return;
    }

    if (!this.data.note.trim()) {
      wx.showToast({
        title: '请记录一下此刻的想法',
        icon: 'none'
      });
      return;
    }

    const moodRecord = {
      mood: this.data.selectedMood,
      moodText: this.data.moodTypes[this.data.selectedMood],
      note: this.data.note,
      timestamp: new Date().getTime(),
      date: new Date().toISOString().split('T')[0] // 添加日期标记
    };

    this.getAIFeedback(moodRecord);
  },

  getAIFeedback(record) {
    wx.showLoading({
      title: '小助手思考中...'
    });

    wx.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer c08b8511-a089-43df-9ab4-3b1c2edc20ce'
      },
      data: {
        model: 'deepseek-r1-250120',
        messages: [
          {
            role: 'system',
            content: '你是一个温暖贴心的小助手，请以朋友的口吻分析Ta的心情。回复格式：1. 先理解和共情Ta的感受；2. 给出具体可行的建议（3-4条）；3. 最后推荐一首适合现在心情的歌曲，格式为：《歌名》- 歌手。注意：说话要温柔，避免说教，建议要具体实用。'
          },
          {
            role: 'user',
            content: `我的朋友现在感觉${record.moodText}，Ta说：${record.note}。请给Ta一些暖心的建议和歌曲推荐。`
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.choices && res.data.choices[0]) {
          let aiText = res.data.choices[0].message.content;
          
          // 提取歌曲信息
          const songMatch = aiText.match(/《(.+?)》\s*[-—–]\s*(.+)/);
          const songInfo = songMatch ? {
            name: songMatch[1],
            artist: songMatch[2]
          } : null;

          // 格式化文本
          aiText = aiText
            .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除加粗标记
            .replace(/\*(.*?)\*/g, '$1')      // 移除斜体标记
            .replace(/(\d+[\)\.、])/g, '\n\n$1') // 序号前添加双换行
            .replace(/(建议|提醒|注意|重要|推荐|可以|首先|其次|最后|另外)/g, '\n<b>$1</b>') // 关键词加粗并换行
            .replace(/。(?![^{]*})/g, '。\n')  // 句号后换行
            .replace(/！(?![^{]*})/g, '！\n')  // 感叹号后换行
            .replace(/\n\s*\n/g, '\n\n')      // 处理多余换行
            .trim();
            
          // AI 反馈成功后，保存完整记录
          const records = wx.getStorageSync('moodRecords') || [];
          records.unshift({
            ...record,
            aiResponse: aiText,
            songInfo: songInfo
          });
          wx.setStorageSync('moodRecords', records);

          this.setData({
            aiResponse: aiText,
            currentSong: songInfo,
            selectedMood: '',
            note: ''
          });

          wx.showToast({
            title: '记录成功',
            icon: 'success',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '小助手累了，稍后再试~',
          icon: 'none'
        });
        console.error('AI 请求失败：', err);
      }
    });
  }
});