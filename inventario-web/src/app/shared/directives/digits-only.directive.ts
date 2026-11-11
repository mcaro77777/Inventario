import { Directive, ElementRef, HostListener, Input, Optional, numberAttribute } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[appDigitsOnly]',
  standalone: true
})
export class DigitsOnlyDirective {
  /** Permite pasar "9" (string) o 9 (number) y lo convierte a number automáticamente */
  @Input({ alias: 'appDigitsOnly', transform: numberAttribute }) maxLen?: number;

  private get el(): HTMLInputElement { return this.host.nativeElement; }

  constructor(private host: ElementRef<HTMLInputElement>, @Optional() private ngControl?: NgControl) {}

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    const isCtrl = e.ctrlKey || e.metaKey;
    if (allowed.includes(e.key) || (isCtrl && ['a','c','v','x'].includes(e.key.toLowerCase()))) return;

    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }

    const sel = this.el.selectionEnd! - this.el.selectionStart!;
    const futureLen = this.el.value.length - sel + 1;
    if (this.maxLen && futureLen > this.maxLen) e.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!/^\d+$/.test(text)) e.preventDefault();
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent) { e.preventDefault(); }

  @HostListener('input')
  onInput() {
    let v = this.el.value.replace(/\D+/g, '');
    if (this.maxLen) v = v.slice(0, this.maxLen);
    if (v !== this.el.value) {
      if (this.ngControl?.control) this.ngControl.control.setValue(v);
      else this.el.value = v;
    }
  }
}
