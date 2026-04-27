/** 上传模块测试环境 setup */
import { setDefaultAdapter } from '../adapters';
import { plainReactiveAdapter } from '../adapters/plainReactiveAdapter';

// 测试环境默认使用 plain 适配器（无需 Vue 依赖）
setDefaultAdapter(plainReactiveAdapter);
