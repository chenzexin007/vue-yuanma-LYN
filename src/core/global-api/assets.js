/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  /**
   * 以components为例：
   *  Vue.components = function('comp', comp)
   *  comp: 对象或者function
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 第二个参数不传，直接返回
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // 如果是 component
        if (type === 'component' && isPlainObject(definition)) {
          // 设置组件名
          definition.name = definition.name || id
          // 基于definition配置，使用Vue.extend进行扩展，得到一个新的扩展Vue子类，并赋值给defintion
          // 后面实例化组件时： new definition()
          definition = this.options._base.extend(definition)
        }
        // directive 和 function
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // Vue.options.components = { comp: comp }，这样我们在这里注册的组件在全局都可以使用
        this.options[type + 's'][id] = definition
        // 返回
        return definition
      }
    }
  })
}
