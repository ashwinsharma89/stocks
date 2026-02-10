import React from 'react'

export default function Loading({ message = 'Loading data...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}
