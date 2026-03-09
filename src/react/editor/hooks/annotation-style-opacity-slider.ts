import { clamp } from './annotation-style-editing-support.js';

export function resolveOpacitySliderValue(slider: HTMLInputElement, clientX: number): number | null {
  const rect = slider.getBoundingClientRect();
  if (rect.width <= 0) {
    return null;
  }

  const min = Number(slider.min || '0');
  const max = Number(slider.max || '1');
  const step = Number(slider.step || '0.01');
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  let pointerValue = min + ratio * (max - min);
  if (Number.isFinite(step) && step > 0) {
    pointerValue = Math.round(pointerValue / step) * step;
  }
  return pointerValue;
}
