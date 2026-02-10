import React, { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function StockChart({ data, symbol, height = 350, showVolume = true }) {
  const chartRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#8892b0',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(42, 42, 74, 0.3)' },
        horzLines: { color: 'rgba(42, 42, 74, 0.3)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: 'rgba(0, 212, 255, 0.3)', width: 1 },
        horzLine: { color: 'rgba(0, 212, 255, 0.3)', width: 1 },
      },
      rightPriceScale: { borderColor: 'rgba(42, 42, 74, 0.5)' },
      timeScale: {
        borderColor: 'rgba(42, 42, 74, 0.5)',
        timeVisible: false,
      },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    const chartData = data.map(d => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candleSeries.setData(chartData)

    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: 'rgba(0, 212, 255, 0.2)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })
      volumeSeries.setData(
        data.map(d => ({
          time: d.date,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        }))
      )
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, height, showVolume])

  return <div ref={containerRef} style={{ width: '100%' }} />
}
