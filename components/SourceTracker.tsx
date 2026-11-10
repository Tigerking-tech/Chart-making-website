'use client';
// 全站来源追踪：只捕获 URL 参数 / referrer，写入本机 localStorage。
// 不发送任何网络请求，不读取用户输入的数据，零隐私影响。
import { useEffect } from 'react';
import { capture, saveRecord } from '@/lib/attribution';

export function SourceTracker() {
  useEffect(() => {
    const rec = capture();
    if (rec) saveRecord(rec);
  }, []);
  return null;
}
