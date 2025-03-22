Page({
  data: {
    record: null,
    isPlaying: false
  },

  onLoad(options) {
    if (options.record) {
      try {
        const record = JSON.parse(decodeURIComponent(options.record));
        this.setData({ record });
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
      } catch (error) {
        console.error('解析记录数据失败：', error);
      }
    }
  },

  onUnload() {
    if (this.audioContext) {
      this.audioContext.destroy();
    }
  },

  playMusic() {
    if (!this.data.record.songInfo) return;
    
    if (this.data.isPlaying) {
      this.audioContext.pause();
    } else {
      wx.request({
        url: 'https://netease-cloud-music-api-teal-phi.vercel.app/search',
        method: 'GET',
        data: {
          keywords: this.data.record.songInfo.name + ' ' + this.data.record.songInfo.artist,
          limit: 1
        },
        success: async (res) => {
          if (res.data.result && res.data.result.songs && res.data.result.songs[0]) {
            const songId = res.data.result.songs[0].id;
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
  }
});