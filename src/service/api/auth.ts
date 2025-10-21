/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-11 10:36:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-17 11:10:38
 * @FilePath: \markdown-preview-demo\src\service\api\auth.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { request } from '../request';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  // return request<Api.Auth.LoginToken>({
  //   url: '/auth/login',
  //   method: 'post',
  //   data: {
  //     userName,
  //     password
  //   }
  // });
  return {
    data: {
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjpbeyJ1c2VyTmFtZSI6IlNveWJlYW4ifV0sImlhdCI6MTY5ODQ4NDg2MywiZXhwIjoxNzMwMDQ0Nzk5LCJhdWQiOiJzb3liZWFuLWFkbWluIiwiaXNzIjoiU295YmVhbiIsInN1YiI6IlNveWJlYW4ifQ._w5wmPm6HVJc5fzkSrd_j-92d5PBRzWUfnrTF1bAmfk',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjpbeyJ1c2VyTmFtZSI6IlNveWJlYW4ifV0sImlhdCI6MTY5ODQ4NDg4MSwiZXhwIjoxNzYxNTgwNzk5LCJhdWQiOiJzb3liZWFuLWFkbWluIiwiaXNzIjoiU295YmVhbiIsInN1YiI6IlNveWJlYW4ifQ.7dmgo1syEwEV4vaBf9k2oaxU6IZVgD2Ls7JK1p27STE'
    },
    code: '0000',
    msg: '请求成功'
  };
}

/** Get user info */
export function fetchGetUserInfo() {
  // return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
  return {
    data: {
      userId: '0',
      userName: 'Soybean',
      roles: ['R_SUPER'],
      buttons: ['B_CODE1', 'B_CODE2', 'B_CODE3']
    },
    code: '0000',
    msg: '请求成功'
  };
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}
