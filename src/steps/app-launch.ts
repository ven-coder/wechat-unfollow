import { AssistsX, log, Step, StepError, StepImpl } from "assistsx-js";

class AppLaunch {
    appName: string = '';
    packageName: string = '';

    launch: StepImpl = async (step: Step): Promise<Step | undefined> => {
        console.log(step.data)
        this.appName = step.data?.appName ?? '';
        this.packageName = step.data?.packageName ?? '';
        if (!this.appName) {
            throw new StepError('❌appName不能为空')
        }
        if (!this.packageName) {
            throw new StepError('❌packageName不能为空')
        }
        const appInfo = await AssistsX.getAppInfo(this.packageName)
        if (!appInfo?.packageName) {
            throw new StepError('❌' + this.appName + '未安装')
        }
        step.launchApp(this.packageName);
        return step.next(this.checkSecurityDialog);
    }

    checkSecurityDialog: StepImpl = async (step: Step): Promise<Step | undefined> => {
        const packageName = await step.async.getPackageName();
        if (packageName == this.packageName) {
            log.appendTimestampedEntry(this.appName + '已打开')
            if (step.data?.finishMethod) {
                return step.next(step.data?.finishMethod)
            }
            return undefined
        }
        const securityDialogNode = (await step.async.findById('com.miui.securitycenter:id/buttonPanel'))[0]
        if (securityDialogNode) {
            log.appendTimestampedEntry('发现小米安全中心弹窗')
            const result = await (await securityDialogNode.async.findById('android:id/button1'))[0].async?.click()
            if (result) {
                log.appendTimestampedEntry('允许')
                return step.next(this.checkDoubleApp)
            } else {
                log.appendTimestampedEntry('允许失败')
            }
        }
        if (step.repeatCount >= 2) {
            log.appendTimestampedEntry('未出现安全中心弹窗')
            return step.next(this.checkDoubleApp)
        }
        log.appendTimestampedEntry(this.appName + '未打开')

        let nextStep = await this.checkDoubleDialog(step)
        if (nextStep) {
            return nextStep
        }

        return step.repeat()
    }

    //检查目标应用双开弹窗
    checkDoubleApp: StepImpl = async (step: Step): Promise<Step | undefined> => {
        log.appendTimestampedEntry('检查' + this.appName + '双开弹窗...')
        const packageName = await step.async.getPackageName();
        if (packageName === this.packageName) {
            log.appendTimestampedEntry(this.appName + '已打开')
            if (step.data?.finishMethod) {
                return step.next(step.data?.finishMethod)
            }
            return undefined
        }

        let nextStep = await this.checkDoubleDialog(step)
        if (nextStep) {
            return nextStep
        }

        if (step.data?.launchRepeatCount >= 3) {
            log.appendTimestampedEntry('⚠️' + this.appName + '打开失败, 请检查是否已安装' + this.appName)
            return undefined
        }
        if (step.repeatCount > 5) {
            log.appendTimestampedEntry('⚠️' + this.appName + '打开失败, 重试...')
            step.data.launchRepeatCount = (step.data?.launchRepeatCount ?? 0) + 1
            return step.next(this.launch)
        }
        return step.repeat()
    }

    checkDoubleDialog: StepImpl = async (step: Step): Promise<Step | undefined> => {
        let nodeAppIndex1 = (await step.async.findById("com.miui.securitycore:id/app1"))[0];
        let nodeAppIndex2 = (await step.async.findById("com.miui.securitycore:id/app2"))[0];
        if (nodeAppIndex1 && nodeAppIndex2) {
            //存在克隆应用
            const result = await nodeAppIndex1.async.click();
            if (result) {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用')
            } else {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用失败')
            }
            return undefined
        }

        //一加colorsos双开弹窗，android15
        nodeAppIndex1 = (await step.async.findById('com.android.intentresolver:id/resolver_item_layout'))[0]
        nodeAppIndex2 = (await step.async.findById('com.android.intentresolver:id/resolver_item_layout'))[1]
        if (nodeAppIndex1 && nodeAppIndex2) {
            //存在克隆应用
            const result = await nodeAppIndex1.async.click();
            if (result) {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用')
            } else {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用失败')
            }
            return undefined
        }

        //oppo双开弹窗，android10
        nodeAppIndex1 = (await step.async.findById('oppo:id/resolver_item_name'))[0]
        nodeAppIndex2 = (await step.async.findById('oppo:id/resolver_item_name'))[1]
        if (nodeAppIndex1 && nodeAppIndex2) {
            //存在克隆应用
            const parentNode = await nodeAppIndex1.async.findFirstParentClickable()
            const result = parentNode ? await parentNode.async.click() : false
            if (result) {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用')
            } else {
                log.appendTimestampedEntry(this.appName + '存在克隆应用，选择' + this.appName + '主应用失败')
            }
            return undefined
        }
        return undefined
    }
    checkLaunch: StepImpl = async (step: Step): Promise<Step | undefined> => {
        const packageName = await step.async.getPackageName();
        if (packageName === this.packageName) {
            log.appendTimestampedEntry(this.appName + '已打开')
            if (step.data?.finishMethod) {
                return step.next(step.data?.finishMethod)
            }

            return undefined
        }

        return step.repeat()
    }
}

export const appLaunch = new AppLaunch()