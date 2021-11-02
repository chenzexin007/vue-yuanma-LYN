/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  // 获取默认配置
  configDef.get = () => config
  // 拦截 Vue.config的set, 不能直接修改
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 将默认配置代理到Vue.config上
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 全局api的实现
  Vue.util = {
    // 日志提示
    warn,
    // extend: 函数/配置对象， 和mixin类似，用于复制上面的属性
    extend,
    // 选项合并
    mergeOptions,
    defineReactive
  }
  // 添加响应式key
  Vue.set = set
  // 删除响应式key
  Vue.delete = del
  // 实现nextTick
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 对整个对象进行响应式处理
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 相当于 Vue.options = { conponents: {}, directives: {}, filters: {} }
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
