import { rectangleContains, rectangleIntersects } from "./math";
import type { Position, Rectangle } from "./types";

class QuadTreeNode<T extends Position> {
	private readonly bounds: Rectangle;
	private readonly maxChildren: number;
	private readonly children: T[];
	private readonly nodes: QuadTreeNode<T>[];

	constructor(bounds: Rectangle, maxChildren: number) {
		this.bounds = bounds;
		this.maxChildren = maxChildren;
		this.children = [];
		this.nodes = [];
	}

	public insert(obj: T): boolean {
		if (!rectangleContains(this.bounds, obj)) return false;
		if (this.children.length < this.maxChildren) {
			this.children.push(obj);
			return true;
		}
		if (!this.nodes.length) {
			this.split();
			this.redistributeChildren();
		}
		for (let i = 0; i < this.nodes.length; i++) {
			if (this.nodes[i].insert(obj)) {
				return true;
			}
		}
		return false;
	}

	split() {
		const { x, y, width, height } = this.bounds;
		const subWidth = width / 2;
		const subHeight = height / 2;

		this.nodes[0] = new QuadTreeNode(
			{ x: x + subWidth, y, width: subWidth, height: subHeight },
			this.maxChildren,
		);
		this.nodes[1] = new QuadTreeNode(
			{ x, y, width: subWidth, height: subHeight },
			this.maxChildren,
		);
		this.nodes[2] = new QuadTreeNode(
			{ x, y: y + subHeight, width: subWidth, height: subHeight },
			this.maxChildren,
		);
		this.nodes[3] = new QuadTreeNode(
			{ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
			this.maxChildren,
		);
	}

	redistributeChildren() {
		for (let i = 0; i < this.children.length; i++) {
			for (let j = 0; j < this.nodes.length; j++) {
				if (this.nodes[j].insert(this.children[i])) {
					this.children.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}

	public retrieve(bounds: Rectangle): T[] {
		const found: T[] = [];

		if (!rectangleIntersects(this.bounds, bounds)) return found;
		this.children.forEach((child) => {
			if (rectangleContains(bounds, child)) {
				found.push(child);
			}
		});

		for (let i = 0; i < this.nodes.length; i++) {
			found.push(...this.nodes[i].retrieve(bounds));
		}

		return found;
	}
}

export default class QuadTree<T extends Position> {
	private root: QuadTreeNode<T>;
	private readonly maxChildren: number;
	private readonly bounds: Rectangle;

	constructor(bounds: Rectangle, maxChildren: number) {
		this.bounds = bounds;
		this.maxChildren = maxChildren;
		this.root = new QuadTreeNode(bounds, maxChildren);
	}

	public insert(obj: T): boolean {
		return this.root.insert(obj);
	}

	public retrieve(bounds: Rectangle): T[] {
		return this.root.retrieve(bounds);
	}

	public clear() {
		this.root = new QuadTreeNode(this.bounds, this.maxChildren);
	}
}
