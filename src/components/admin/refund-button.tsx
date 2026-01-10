'use client'

import { Button } from "@/components/ui/button"
import { getRefundParams, markOrderRefunded, proxyRefund } from "@/actions/refund"
import { verifyOrderRefundStatus } from "@/actions/admin-orders"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, ExternalLink, CheckCircle, RefreshCcw } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export function RefundButton({ order }: { order: any }) {
    const [loading, setLoading] = useState(false)
    const [showMarkDone, setShowMarkDone] = useState(false)
    const { t } = useI18n()

    if (order.status !== 'delivered' && order.status !== 'paid') return null
    if (!order.tradeNo) return null

    const handleRefund = async () => {
        if (!confirm(t('admin.orders.refundConfirm'))) return

        setLoading(true)
        try {
            const params = await getRefundParams(order.orderId)

            // Create and submit form in new tab
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = 'https://credit.linux.do/epay/api.php'
            form.target = '_blank'

            Object.entries(params).forEach(([k, v]) => {
                const input = document.createElement('input')
                input.type = 'hidden'
                input.name = k
                input.value = String(v)
                form.appendChild(input)
            })

            document.body.appendChild(form)
            form.submit()
            document.body.removeChild(form)

            setShowMarkDone(true)
            toast.info(t('admin.orders.refundInfo'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleProxyRefund = async () => {
        if (!confirm(t('admin.orders.refundProxyConfirm'))) return
        setLoading(true)
        try {
            const result = await proxyRefund(order.orderId)
            if (result.processed) {
                toast.success(t('admin.orders.refundSuccess'))
            } else {
                toast.info(t('admin.orders.refundProxyNotProcessed'))
                setShowMarkDone(true)
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkDone = async () => {
        if (!confirm(t('admin.orders.refundVerify'))) return

        setLoading(true)
        try {
            await markOrderRefunded(order.orderId)
            toast.success(t('admin.orders.refundSuccess'))
            setShowMarkDone(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setLoading(true)
        try {
            const result = await verifyOrderRefundStatus(order.orderId)
            if (result.success) {
                if (result.status === 0) { // Refunded
                    toast.success(t('admin.orders.verifySuccessRefunded'))
                } else if (result.status === 1) { // Paid
                    toast.info(t('admin.orders.verifyInfoPaid'))
                    setShowMarkDone(true)
                } else {
                    toast.info(`${t('admin.orders.verifyStatus')}: ${result.msg}`)
                }
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleVerify} disabled={loading} title={t('admin.orders.checkStatus')}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCcw className="h-3 w-3" /></>}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefund} disabled={loading || showMarkDone}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ExternalLink className="h-3 w-3 mr-1" />{t('admin.orders.refund')}</>}
            </Button>
            <Button variant="outline" size="sm" onClick={handleProxyRefund} disabled={loading || showMarkDone}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ExternalLink className="h-3 w-3 mr-1" />{t('admin.orders.refundProxy')}</>}
            </Button>
            {showMarkDone && (
                <Button variant="default" size="sm" onClick={handleMarkDone} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />{t('admin.orders.markRefunded')}</>}
                </Button>
            )}
        </div>
    )
}
