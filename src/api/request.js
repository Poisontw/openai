import axios from 'axios';

// 创建 Axios 实例
const service = axios.create({
  baseURL: '',
});

// 请求拦截器
service.interceptors.request.use(
  config => {
    config.headers.Authorization = 'Bearer ';

    return config;
  },
  error => {
    // 请求错误处理
    return Promise.reject(error);
  },
);

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    return response;
  },
  error => {
    return Promise.reject(error);
  },
);

export default service;
