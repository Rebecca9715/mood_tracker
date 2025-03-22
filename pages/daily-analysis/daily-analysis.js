const auth = require('../../utils/auth.js')

Page({
  data: {
    date: '',
    dailyRecords: [],
    analysis: '',
    isAnalyzing: false,
    hasAnalysis: false,
    progressValue: 0,
    progressTimer: null
  },

  onAnalysisTap() {  // 添加新的点击处理方法
    if (this.data.analysis) {  // 改用 analysis 来判断是否已有报告
      wx.showModal({
        title: '提示',
        content: '重新生成将会覆盖当前的分析报告，确定继续吗？',
        success: (res) => {
          if (res.confirm) {
            this.generateAnalysis();
          }
        }
      });
    } else {
      this.generateAnalysis();
    }
  },

  loadDailyRecords(date) {
    const allRecords = wx.getStorageSync('moodRecords') || [];
    const targetDate = new Date(date).toISOString().split('T')[0];
    const dailyRecords = allRecords.filter(record => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      return recordDate === targetDate;
    });
    
    // 检查是否已有分析报告
    const hasExistingAnalysis = dailyRecords.some(record => record.analysis);
    const existingAnalysis = hasExistingAnalysis && dailyRecords[0]?.analysis || '';
    
    // 使用箭头函数保持 this 的指向
    const formattedRecords = dailyRecords.map((record) => {
      const date = new Date(record.timestamp);
      const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      return {
        ...record,
        formattedTime,
        moodText: record.moodText || record.mood
      };
    });
    
    this.setData({
      dailyRecords: formattedRecords,
      analysis: existingAnalysis,
      hasAnalysis: Boolean(existingAnalysis)  // 根据实际分析内容设置状态
    });
  },

  // 添加进度条控制方法
  startProgress() {
    let progress = 0;
    const timer = setInterval(() => {
      // 模拟AI分析进度
      if (progress < 30) {
        progress += 2;
      } else if (progress < 60) {
        progress += 1;
      } else if (progress < 85) {
        progress += 0.5;
      }
      
      if (progress >= 85) {
        clearInterval(timer);
      }
      this.setData({ progressValue: progress });
    }, 200);
    this.setData({ progressTimer: timer });
  },

  generateAnalysis() {
    if (this.data.dailyRecords.length === 0) {
      wx.showToast({
        title: '今天还没有记录心情呢~',
        icon: 'none'
      });
      return;
    }

    this.setData({ 
      isAnalyzing: true,
      progressValue: 0  // 重置进度
    });
    this.startProgress();  // 开始进度动画
    wx.showLoading({ title: '小助手正在认真分析...' });

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const moodSummary = this.data.dailyRecords.map(r => 
      `${formatTime(r.timestamp)}时，Ta感觉${r.moodText}，说：${r.note}`
    ).join('\n');

    // 分析当天的主要情绪基调
    const emotionTone = this.analyzeMoodTone(this.data.dailyRecords);

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
            content: `你是一个温暖贴心的小助手。${this.getAITonePrompt(emotionTone)}请分析内容包括：1. 今天的心情轨迹；2. 情绪波动的原因；3. 给出具体的改善建议。最后用分隔线分开，给出"明日小任务"（3条具体可执行的行动）。`
          },
          {
            role: 'user',
            content: `这是我今天的心情记录：\n${moodSummary}\n请帮我分析一下今天的心情变化，并给出一些建议和明天可以做的具体行动~`
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data?.choices?.[0]?.message?.content) {
          let analysis = res.data.choices[0].message.content;
          
          // 优化文本格式化
          analysis = analysis
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/(\d+[\)\.、])/g, '\n$1')  // 修改数字序号的换行
            .replace(/(发现|原因|建议|提醒|改善|首先|其次|最后|另外|小建议)/g, '\n<b>$1</b>')
            .replace(/([。！？])\s*/g, '$1\n')  // 只在标点符号后换行
            .replace(/[《](.*?)[》]/g, '《$1》')  // 移除书名号的换行
            .replace(/[-]{3,}/g, '\n<div class="divider"></div>\n')
            .replace(/(明日小任务|明天可以做的事|行动计划)：?/g, '\n<div class="divider"></div>\n<b class="task-title">$1</b>\n')
            .replace(/\p{Extended_Pictographic}/gu, ' $& ')  // 表情符号前后加空格
            .replace(/[【\[\{\「]/g, '\n$&')
            .replace(/\n{3,}/g, '\n\n')  // 限制最大连续换行数
            .trim();
          
          // 设置进度为100%
          this.setData({ progressValue: 100 });
          setTimeout(() => {
            this.setData({ 
              analysis,
              isAnalyzing: false,
              hasAnalysis: true,
              progressValue: 0  // 完成后重置进度
            });
          }, 500);  // 等待进度条动画完成
          
          // 优化文本格式化
          analysis = analysis
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/(\d+[\)\.、])/g, '\n\n$1')
            .replace(/(发现|原因|建议|提醒|改善|首先|其次|最后|另外|小建议)/g, '\n\n<b>$1</b>')
            .replace(/([。！？])/g, '$1\n')
            .replace(/[《](.*?)[》]/g, '\n《$1》\n')
            .replace(/[-]{3,}/g, '\n<div class="divider"></div>\n')
            .replace(/(明日小任务|明天可以做的事|行动计划)：?/g, '\n<div class="divider"></div>\n<b class="task-title">$1</b>\n')
            .replace(/\p{Extended_Pictographic}/gu, '\n\n$&')
            .replace(/[【\[\{\「]/g, '\n$&')
            .replace(/([0-9️⃣])/g, '\n\n$1')  // 添加对数字表情的处理
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          
          // 保存分析报告
          const allRecords = wx.getStorageSync('moodRecords') || [];
          const today = new Date().toISOString().split('T')[0];
          const updatedRecords = allRecords.map(record => {
            if (new Date(record.timestamp).toISOString().split('T')[0] === today) {
              return { ...record, analysis };
            }
            return record;
          });
          
          wx.setStorageSync('moodRecords', updatedRecords);
          
          this.setData({ 
            analysis,
            isAnalyzing: false,
            hasAnalysis: true
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ 
          isAnalyzing: false,
          progressValue: 0  // 失败时重置进度
        });
        this.resetProgress();  // 重置进度条
        wx.showToast({
          title: '小助手累了，稍后再试~',
          icon: 'none'
        });
        this.setData({ isAnalyzing: false });
      }
    });
  },

  analyzeMoodTone(records) {
    const moodCounts = records.reduce((acc, record) => {
      acc[record.mood] = (acc[record.mood] || 0) + 1;
      return acc;
    }, {});
    
    // 找出最频繁的情绪
    const mainMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return mainMood;
  },

  getAITonePrompt(mood) {
    const toneMap = {
      happy: '请用轻快活泼的语气，多用可爱的语气词，像好朋友一样聊天。',
      sad: '请用温柔安慰的语气，表达理解和支持，给予温暖的鼓励。',
      angry: '请用平和冷静的语气，帮助梳理情绪，给予建设性的建议。',
      anxious: '请用稳定平静的语气，帮助缓解焦虑，给予具体可行的指导。',
      neutral: '请用温和友善的语气，像朋友一样交流，给予积极的反馈。'
    };
    
    return toneMap[mood] || toneMap.neutral;
  },

  onLoad() {
    if (!auth.checkLogin()) {
      auth.redirectToLogin()
      return
    }
    const today = new Date().toISOString().split('T')[0];
    this.setData({ date: today });
    this.loadDailyRecords(today);
  },

  loadDailyRecords(date) {
    const allRecords = wx.getStorageSync('moodRecords') || [];
    const targetDate = new Date(date).toISOString().split('T')[0];
    const dailyRecords = allRecords.filter(record => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      return recordDate === targetDate;
    });
    
    // 检查是否已有分析报告
    const hasExistingAnalysis = dailyRecords.some(record => record.analysis);
    const existingAnalysis = hasExistingAnalysis && dailyRecords[0]?.analysis || '';
    
    // 使用箭头函数保持 this 的指向
    const formattedRecords = dailyRecords.map((record) => {
      const date = new Date(record.timestamp);
      const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      return {
        ...record,
        formattedTime,
        moodText: record.moodText || record.mood
      };
    });
    
    this.setData({
      dailyRecords: formattedRecords,
      analysis: existingAnalysis,
      hasAnalysis: hasExistingAnalysis
    });
  },

  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ 
      date,
      analysis: '', // 清空之前的分析
      hasAnalysis: false // 重置分析状态
    });
    this.loadDailyRecords(date);
  }
});