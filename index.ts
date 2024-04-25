/*
 * @Autor: Joseph
 * @Description:
 * @Date: 2024-04-24 17:13:36
 * @LastEditTime: 2024-04-25 15:06:29
 */
// import { ScanStatus, WechatyBuilder } from "wechaty";
import { ScanStatus, WechatyBuilder } from "@juzi/wechaty";
import QrcodeTerminal from "qrcode-terminal";
import { types } from "@juzi/wechaty-puppet";
// 验证码
import fs from "fs";
import path from "path";

// 获取项目根目录路径
const rootDir = process.cwd();
// 根目录下的文本文件名
const fileName = "code.txt";
// 构建文件的完整路径
const filePath = path.resolve(rootDir, fileName);
// 先清空旧的数据
fs.writeFileSync(filePath,'');

const token = "user_token"; 
// https://tss.rpachat.com 这个网址可以注册申请免费使用7天，7 天后如继续使用，将按照 2400/年收费，
// 可对公支付、支付宝支付
// 企微token文档：https://wechaty.js.org/docs/puppet-services/workpro 
const bot = WechatyBuilder.build({
  // puppet: "wechaty-puppet-service",
  puppet: "@juzi/wechaty-puppet-service", 
  puppetOptions: {
    token,
    WECHATY_PUPPET_SERVICE_AUTHORITY: "token-service-discovery-test.juzibot.com",
    WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIEN: true,
    tls: {
      disable: true,
      // currently we are not using TLS since most puppet-service versions does not support it. See: https://github.com/wechaty/puppet-service/issues/160
    },
  },
});

bot
  .on("scan", (qrcode, status, data) => {
    console.log(`
  ============================================================
  qrcode : ${qrcode}, status: ${status}, data: ${data}
  ============================================================
  `);
    if (status === ScanStatus.Waiting) {
      QrcodeTerminal.generate(qrcode, {
        small: true,
      });
    }
  }) 
  .on(
    "verify-code",
   async (
      id: string,
      message: string,
      scene: types.VerifyCodeScene,
      status: types.VerifyCodeStatus
    ) => { 
      if (
        status === types.VerifyCodeStatus.WAITING &&
        scene === types.VerifyCodeScene.LOGIN 
      ) {
        console.log('请在code.txt中输入验证码')
        const verifyCode = await getVerifyCode(); // get verify-code from some async methods, e.g. console input
        try {
          await bot.enterVerifyCode(id, verifyCode); // if no error was caught, it means the verify-code is correct, and the login event should be expected
          return;
        } catch (e) {
          console.log(e);
          // if there is error, please handle according to the message. Currently you can input 3 times.
          // message keyword: 验证码错误输入错误，请重新输入
          // message keyword: 验证码错误次数超过阈值，请重新扫码
          // currently no ```EXPIRED``` event will be pushed, you should decided from the error message.
        }
      }
    }
  )
  .on("login", (user) => {
    console.log(`
  ============================================
  user: ${JSON.stringify(user)}, friend: ${user.friend()}, ${user.coworker()}
  ============================================
  `);
  })
  .on("message", (message) => {
    console.log(`new message received: ${JSON.stringify(message)}`);
  })
  .on("error", (err) => {
    console.log(err);
  });

bot.start();

function getVerifyCode(): string {
  let code: string = "";
  do {
    //获取到验证码，边界code.txt保存即可
    const verifyCode = fs.readFileSync(filePath, "utf8"); 
    if (verifyCode) { 
      console.log("获取到的验证码："+verifyCode);
      // code = verifyCode.replace(/\s+/g, "");
      code = verifyCode; 
    }
  } while (code.length < 1);
  return code;
}
