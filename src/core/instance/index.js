import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue 构造函数
function Vue (options) {
  // 这里只是打印环境，没啥用，不需要看
  // if (process.env.NODE_ENV !== 'production' &&
  //   !(this instanceof Vue)
  // ) {
  //   warn('Vue is a constructor and should be called with the `new` keyword')
  // }
  // _init方法在initMixin中， Vue.prototype._init
  this._init(options)
}

initMixin(Vue)
// 实例方法的实现
/**
 * vue.prototype.$data
 * vue.prototype.$props
 * vue.prototype.$set
 * vue.prototype.$del
 * vue.prototype.$watch
 */
stateMixin(Vue)
/**
 * vue.prototype.$on
 * vue.prototype.$once
 * vue.prototype.$off
 * vue.prototype.$emit
 */
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
