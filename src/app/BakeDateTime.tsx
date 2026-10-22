'use client';

import { useEffect, useRef, useState } from 'react';

const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromKey = (value: string) => new Date(`${value}T12:00:00`);
const plusDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
const pad = (n: number) => String(n).padStart(2, '0');

export default function BakeDateTime({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const date = value.slice(0, 10);
  const [time, setTime] = useState(value.slice(11, 16) || '19:00');
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [focusedDay, setFocusedDay] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const dateTrigger = useRef<HTMLButtonElement>(null);
  const timeTrigger = useRef<HTMLButtonElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (value.slice(11, 16)) setTime(value.slice(11, 16)); }, [value]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(null); (open === 'date' ? dateTrigger : timeTrigger).current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => {
    if (open === 'date') root.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedDay}"]`)?.focus();
    if (open === 'time') timeInput.current?.focus();
  }, [open, focusedDay]);
  const chooseDay = (day: Date) => { onChange(`${key(day)}T${time}`); setOpen(null); dateTrigger.current?.focus(); };
  const chooseTime = (next: string) => { setTime(next); if (date) onChange(`${date}T${next}`); };
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const gridStart = plusDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => plusDays(gridStart, i));
  const today = new Date();
  const toggleDate = () => { const selected = date ? fromKey(date) : today; setMonth(selected); setFocusedDay(key(selected)); setOpen(open === 'date' ? null : 'date'); };
  const moveMonth = (delta: number) => { const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12); setMonth(next); setFocusedDay(key(next)); };
  return <div className="bake-picker" ref={root}>
    <div className="bake-picker-fields">
      <button ref={dateTrigger} type="button" className={'bake-field ' + (open === 'date' ? 'is-open' : '')} aria-expanded={open === 'date'} aria-controls="bake-calendar" onClick={toggleDate}><span>BACKDATUM</span><strong>{date ? fromKey(date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Tag wählen'}</strong><small>{date ? fromKey(date).getFullYear() : 'Deine nächste Pizza'} <b aria-hidden="true">⌄</b></small></button>
      <button ref={timeTrigger} type="button" className={'bake-field ' + (open === 'time' ? 'is-open' : '')} aria-expanded={open === 'time'} aria-controls="bake-clock" onClick={() => setOpen(open === 'time' ? null : 'time')}><span>IN DEN OFEN UM</span><strong>{time}<em> Uhr</em></strong><small>Erste Pizza <b aria-hidden="true">⌄</b></small></button>
    </div>
    {open === 'date' && <section id="bake-calendar" className="bake-popover" aria-label="Backdatum wählen">
      <div className="calendar-nav"><button type="button" aria-label="Vorheriger Monat" onClick={() => moveMonth(-1)}>‹</button><strong aria-live="polite">{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Nächster Monat" onClick={() => moveMonth(1)}>›</button></div>
      <div className="calendar-grid" role="group" aria-label="Kalendertage">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map(day => <button type="button" key={key(day)} data-day={key(day)} tabIndex={focusedDay === key(day) ? 0 : -1} className={(day.getMonth() !== month.getMonth() ? 'muted ' : '') + (date === key(day) ? 'selected ' : '') + (key(today) === key(day) ? 'today' : '')} aria-label={day.toLocaleDateString('de-DE', { dateStyle: 'full' })} aria-pressed={date === key(day)} aria-current={key(today) === key(day) ? 'date' : undefined} onClick={() => chooseDay(day)} onKeyDown={event => {
        const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (offset !== undefined) { event.preventDefault(); const next = plusDays(day, offset); setMonth(next); setFocusedDay(key(next)); }
        if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); moveMonth(event.key === 'PageUp' ? -1 : 1); }
      }}>{day.getDate()}</button>)}</div>
      <div className="picker-shortcuts">{[{ label: 'Heute', day: today }, { label: 'Morgen', day: plusDays(today, 1) }, { label: 'Samstag', day: plusDays(today, (6 - today.getDay() + 7) % 7) }].map(item => <button type="button" key={item.label} onClick={() => chooseDay(item.day)}>{item.label}</button>)}</div>
    </section>}
    {open === 'time' && <section id="bake-clock" className="bake-popover clock-popover" aria-label="Backzeit wählen">
      <div className="clock-heading"><div><strong>Deine Backzeit</strong><p>Direkt eingeben oder unten auswählen</p></div><input ref={timeInput} aria-label="Uhrzeit in Stunden und Minuten" type="text" inputMode="numeric" maxLength={5} defaultValue={time} key={time} placeholder="19:00" onBlur={event => { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) chooseTime(event.target.value); else event.target.value = time; }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); const next = event.currentTarget.value; if (/^([01]\d|2[0-3]):[0-5]\d$/.test(next)) { chooseTime(next); setOpen(null); timeTrigger.current?.focus(); } else event.currentTarget.setCustomValidity('Bitte eine Uhrzeit wie 15:30 eingeben.'); event.currentTarget.reportValidity(); } }} onInput={event => event.currentTarget.setCustomValidity('')}/></div>
      <p className="picker-label">STUNDE</p><div className="clock-hours">{Array.from({ length: 24 }, (_, hour) => <button type="button" key={hour} aria-pressed={+time.slice(0, 2) === hour} className={+time.slice(0, 2) === hour ? 'selected' : ''} onClick={() => chooseTime(`${pad(hour)}:${time.slice(3)}`)}>{pad(hour)}</button>)}</div>
      <p className="picker-label">MINUTE</p><div className="clock-minutes">{[0, 15, 30, 45].map(minute => <button type="button" key={minute} aria-pressed={+time.slice(3) === minute} className={+time.slice(3) === minute ? 'selected' : ''} onClick={() => chooseTime(`${time.slice(0, 2)}:${pad(minute)}`)}>:{pad(minute)}</button>)}</div>
      <button type="button" className="picker-done" onClick={() => { setOpen(null); timeTrigger.current?.focus(); }}>Übernehmen ✓</button>
    </section>}
  </div>;
}
