/**
 * App settings window (opened with the ⚙ gear icon, top-right of the main
 * window). Rendered as a modal overlay. First setting: Windows autostart.
 */

import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import LangSwitcher from './LangSwitcher';

function Toggle({ on, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!on)} style={{
      width: 46, height: 24, borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
      background: on ? '#2563eb' : '#334155', position: 'relative',
      transition: 'background .15s', flexShrink: 0, opacity: disabled ? .5 : 1,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 24 : 2, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left .15s',
      }} />
    </div>
  );
}

export default function AppSettings({ onClose }) {
  const t = useT();
  const api = window.electronAPI;
  const [autostart, setAutostart] = useState(null);   // null = loading / unavailable
  const [updateReady,  setUpdateReady]  = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [appVersion,   setAppVersion]   = useState('');
  const [installing,   setInstalling]   = useState(false);
  const [checking,     setChecking]     = useState(false);

  useEffect(() => {
    if (!api?.getAutostart) return;
    api.getAutostart().then(v => setAutostart(!!v)).catch(() => setAutostart(null));
  }, []);

  useEffect(() => {
    if (!api?.getAppVersion) return;
    api.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!api?.getUpdateStatus) return;
    const poll = () => {
      api.getUpdateReady().then(v => setUpdateReady(!!v)).catch(() => {});
      api.getUpdateStatus().then(v => setUpdateStatus(v || 'idle')).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 3_000);
    return () => clearInterval(id);
  }, []);

  const handleCheckNow = async () => {
    setChecking(true);
    await api?.checkForUpdates?.().catch(() => {});
    setTimeout(() => setChecking(false), 4_000);
  };

  const toggleAutostart = async (v) => {
    setAutostart(v);
    try { await api?.setAutostart?.(v); } catch { /* keep optimistic value */ }
  };

  const row = (label, desc, control) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
      borderBottom: '1px solid #1e293b' }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: 12.5, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {control}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,6,23,.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxWidth: '92%', maxHeight: '86vh', overflowY: 'auto',
        background: '#111827', border: '1px solid #1e293b', borderRadius: 14,
        padding: '22px 26px', boxShadow: '0 16px 64px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#e2e8f0', flex: 1 }}>
            ⚙ {t('settings_title')}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#64748b',
            fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>✕</button>
        </div>

        {row(
          t('language_label'),
          t('language_desc'),
          <LangSwitcher />,
        )}

        {row(
          t('autostart_label'),
          t('autostart_desc'),
          autostart === null
            ? <span style={{ color: '#475569', fontSize: 12 }}>—</span>
            : <Toggle on={autostart} onChange={toggleAutostart} />,
        )}

        {row(
          t('update_label') || 'Оновлення',
          (() => {
            if (!api?.getUpdateStatus) return t('update_unavail') || 'Недоступно в цій версії';
            if (updateStatus === 'checking')    return t('update_checking')    || 'Перевіряємо наявність оновлень…';
            if (updateStatus === 'downloading') return t('update_downloading') || 'Завантаження оновлення…';
            if (updateStatus === 'available')   return t('update_available')   || 'Знайдено нову версію, завантажуємо…';
            if (updateStatus === 'ready')       return t('update_ready_desc')  || 'Оновлення готове. Буде встановлено після закриття Dota 2.';
            if (updateStatus === 'error')       return t('update_error')       || 'Помилка перевірки оновлень.';
            // idle or up-to-date
            return appVersion
              ? (t('update_current') || `Версія ${appVersion} — актуальна`).replace('{v}', appVersion)
              : (t('update_uptodate') || 'Версія актуальна');
          })(),
          updateReady
            ? <button
                onClick={async () => { setInstalling(true); await api?.installUpdateNow?.().catch(() => {}); }}
                disabled={installing}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                  cursor: installing ? 'default' : 'pointer', opacity: installing ? .6 : 1, whiteSpace: 'nowrap' }}>
                {installing ? '…' : (t('update_install_btn') || 'Встановити')}
              </button>
            : <button
                onClick={handleCheckNow}
                disabled={checking || updateStatus === 'checking' || updateStatus === 'downloading'}
                style={{ background: 'transparent', color: '#64748b', border: '1px solid #334155',
                  borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600,
                  cursor: checking ? 'default' : 'pointer', opacity: checking ? .5 : 1, whiteSpace: 'nowrap' }}>
                {checking ? '…' : (t('update_check_btn') || 'Перевірити')}
              </button>,
        )}
      </div>
    </div>
  );
}
