import { IBuffer } from './types';

export class BufferReader implements IBuffer {
	private _data: DataView;
	private _position: number;
	private _littleEndian: boolean;

	get littleEndian(): boolean {
		return this._littleEndian;
	}

	get length(): number {
		return this._data.buffer.byteLength;
	}

	get bytesAvailable(): number {
		return this.length - this._position;
	}

	get position(): number {
		return this._position;
	}

	set position(value: number) {
		if (value < 0) {
			value = 0;
		} else if (value > this.length) {
			value = this.length;
		}

		this._position = value;
	}

	get buffer(): ArrayBuffer {
		return this._data.buffer;
	}

	constructor(buffer: ArrayBuffer, littleEndian: boolean = false) {
		this._data = new DataView(buffer);
		this._position = 0;
		this._littleEndian = littleEndian;
	}

	private movePosition(value: number) {
		this._position += value;
	}

	readUint8(): number {
		const value = this._data.getUint8(this._position);
		this.movePosition(1);
		return value;
	}

	readUint16(): number {
		const value = this._data.getUint16(this._position, this._littleEndian);
		this.movePosition(2);
		return value;
	}

	readUint32(): number {
		const value = this._data.getUint32(this._position, this._littleEndian);
		this.movePosition(4);
		return value;
	}

	readUintVar(): number {
		let value = 0;
		let offset = 1;
		let byte = 0;

		do {
			byte = this.readUint8();
			value += (byte & 0x7f) * offset;
			offset *= 128;
		} while (byte & 0x80);

		return value;
	}

	readIntVar(): number {
		const byte = this.readUint8();
		const sign = byte & 1 ? -1 : 1;
		let value = (byte >>> 1) & 0x3f;

		if (byte & 0x80) {
			value += this.readUintVar() * 64;
		}

		return value * sign;
	}

	readInt8(): number {
		const value = this._data.getInt8(this._position);
		this.movePosition(1);
		return value;
	}

	readInt16(): number {
		const value = this._data.getInt16(this._position, this._littleEndian);
		this.movePosition(2);
		return value;
	}

	readInt32(): number {
		const value = this._data.getInt32(this._position, this._littleEndian);
		this.movePosition(4);
		return value;
	}

	readFloat32(): number {
		const value = this._data.getFloat32(this._position, this._littleEndian);
		this.movePosition(4);
		return value;
	}

	readFloat64(): number {
		const value = this._data.getFloat64(this._position, this._littleEndian);
		this.movePosition(8);
		return value;
	}

	readString(): string {
		let count = this.readUintVar();
		if (!count) {
			return '';
		}

		let value = '';
		if (count) {
			while (count--) {
				value += String.fromCharCode(this.readUintVar());
			}
		}
		return value;
	}

	readBuffer(): ArrayBuffer {
		const count = this.readUintVar();
		const value = this._data.buffer.slice(
			this._position,
			this._position + count,
		);
		this.movePosition(value.byteLength);
		return value;
	}

	readFlags(count: number): boolean[] {
		const value = this.readUintVar();
		const flags: boolean[] = [];

		for (let i = 0; i < count; i++) {
			flags.push(!!(value & (2 ** i)));
		}

		return flags;
	}

	readBitset(count: number): boolean[] {
		const value: boolean[] = [];

		if (count) {
			let bitset = this.readUint8();
			let position = 0;

			while (count--) {
				value.push(!!(bitset & (2 ** position)));
				position++;
				if (position === 8 && count) {
					bitset = this.readUint8();
					position = 0;
				}
			}
		}

		return value;
	}
}
