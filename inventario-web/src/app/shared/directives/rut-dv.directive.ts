import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[appRutDv]',
  standalone: true
})
export class RutDvDirective {
  private get el(): HTMLInputElement { return this.host.nativeElement; }
  constructor(private host: ElementRef<HTMLInputElement>, @Optional() private ngControl?: NgControl) {}

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const allowedControl = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (allowedControl.includes(e.key)) return;

    // Solo 1 carácter: 0–9 o K/k
    const k = e.key.toUpperCase();
    if (!/^[0-9K]$/.test(k)) { e.preventDefault(); return; }
    if ((this.el.selectionEnd! - this.el.selectionStart!) === 0 && this.el.value.length >= 1) e.preventDefault();
  }

  @HostListener('input')
  onInput() {
    let v = this.el.value.toUpperCase().replace(/[^0-9K]/g, '').slice(0, 1);
    if (v !== this.el.value) {
      if (this.ngControl?.control) this.ngControl.control.setValue(v);
      else this.el.value = v;
    }
  }
}
