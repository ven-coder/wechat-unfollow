import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LogPanel from '../views/LogPanel.vue'
import RunnerFloatPanel from '../views/RunnerFloatPanel.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/index.html', redirect: '/' },
    { path: '/', name: 'home', component: HomePage },
    {
      path: '/runner',
      name: 'runner',
      component: RunnerFloatPanel,
    },
    {
      path: '/examples/log-panel',
      name: 'logPanel',
      component: LogPanel,
    },
  ],
})
