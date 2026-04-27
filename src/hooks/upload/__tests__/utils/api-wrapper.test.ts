/** api-wrapper 测试 */
import { describe, expect, it } from 'vitest';
import {
  createMethodWrapper,
  createMethodWrappers,
  createPropertyAccessor,
  createPropertyAccessors
} from '../../utils/api-wrapper';

describe('api-wrapper', () => {
  describe('createMethodWrapper', () => {
    it('应该包装方法并保留 this 上下文', () => {
      const obj = {
        name: 'test',
        getName() {
          return this.name;
        }
      };
      const wrapped = createMethodWrapper(obj, 'getName');
      expect(wrapped()).toBe('test');
    });

    it('应该传递参数给原始方法', () => {
      const obj = {
        add(a: number, b: number) {
          return a + b;
        }
      };
      const wrapped = createMethodWrapper(obj, 'add');
      expect(wrapped(3, 4)).toBe(7);
    });

    it('应该对非函数属性抛出 TypeError', () => {
      const obj = { notMethod: 42 };
      expect(() => createMethodWrapper(obj as any, 'notMethod')).toThrow(TypeError);
    });
  });

  describe('createMethodWrappers', () => {
    it('应该批量包装多个方法', () => {
      const obj = {
        greet(name: string) {
          return `hello ${name}`;
        },
        farewell(name: string) {
          return `bye ${name}`;
        }
      };
      const wrappers = createMethodWrappers(obj, ['greet', 'farewell']);
      expect(wrappers.greet('world')).toBe('hello world');
      expect(wrappers.farewell('world')).toBe('bye world');
    });
  });

  describe('createPropertyAccessor', () => {
    it('应该返回属性值', () => {
      const obj = { count: 5, name: 'test' };
      expect(createPropertyAccessor(obj, 'count')).toBe(5);
      expect(createPropertyAccessor(obj, 'name')).toBe('test');
    });
  });

  describe('createPropertyAccessors', () => {
    it('应该批量创建属性访问器', () => {
      const obj = {
        uploadQueue: { value: [1, 2, 3] },
        isPaused: { value: false },
        totalProgress: { value: 50 }
      };
      const accessors = createPropertyAccessors(obj, ['uploadQueue', 'isPaused', 'totalProgress']);
      expect(accessors.uploadQueue).toEqual({ value: [1, 2, 3] });
      expect(accessors.isPaused).toEqual({ value: false });
      expect(accessors.totalProgress).toEqual({ value: 50 });
    });

    it('返回类型应该保留原始属性类型（Pick）', () => {
      const obj = {
        count: { value: 5 } as { value: number },
        name: { value: 'test' } as { value: string }
      };
      const accessors = createPropertyAccessors(obj, ['count', 'name'] as const);
      // 类型验证：accessors.count 应为 { value: number }，accessors.name 应为 { value: string }
      expect(typeof accessors.count.value).toBe('number');
      expect(typeof accessors.name.value).toBe('string');
    });
  });
});
