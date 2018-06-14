/**
 * Created by virus_zhh on 2017/9/29.
 */
import VJstree from './tree.vue'

VJstree.install = function(Vue){
  Vue.component(VJstree.name, VJstree)
}

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VJstree);
}

export default VJstree

// import Vue from 'vue'

// import App from '../App.vue'

// import VJstree from './tree.vue'
// Vue.component(VJstree.name, VJstree)


// Vue.config.productionTip = false

// /* eslint-disable no-new */
// new Vue({
//   el: '#app',
//   components: { App },
//   template: '<App/>'
// })