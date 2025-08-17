import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { scaleOrdinal, scaleBand, scaleLinear } from '@visx/scale';
import { withTooltip, Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { Filter, Calendar, Users, Activity, Eye, X, Download, Search, RotateCcw, Maximize2, BarChart3, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, FileText, Share2, Settings, Bell, Zap } from 'lucide-react';
import './App.css';

// Import dummy data
import dummyData from './data.json';

// Optimized debounce utility for performance
const useDebounce = (callback, delay) => {
  const timerRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// Performance optimization hook for throttling
const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

const statusColorMap = {
  success: '#22c55e', // green
  warning: '#eab308', // yellow
  fail: '#ef4444'     // red
};

const statusIcons = {
  success: '✅',
  warning: '⚠️',
  fail: '❌'
};

const tabs = ['Overview', 'Transaction', 'Association', 'Behaviour', 'FCR Score', 'Sanction', 'Evidence'];

// Bar Graph Component for Trend Analysis
const BarGraph = memo(withTooltip(({
  data,
  width = 800,
  height = 400,
  showTooltip,
  hideTooltip,
  tooltipData,
  tooltipTop,
  tooltipLeft,
  granularity = 'weekly',
  showTrends = true
}) => {
  const margin = { top: 40, right: 60, bottom: 80, left: 80 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Process data for bar chart based on granularity
  const processedData = useMemo(() => {
    const dates = Array.from(new Set(data.map(d => d.date))).sort();

    if (granularity === 'yearly') {
      const yearlyData = {};
      data.forEach(item => {
        const year = format(parseISO(item.date), 'yyyy');
        if (!yearlyData[year]) {
          yearlyData[year] = { period: year, total: 0, success: 0, warning: 0, fail: 0, trend: 0 };
        }
        yearlyData[year].total++;
        yearlyData[year][item.status]++;
      });

      const years = Object.keys(yearlyData).sort();
      return years.map((year, index) => {
        const current = yearlyData[year];
        const previous = index > 0 ? yearlyData[years[index - 1]] : null;
        const trend = previous ? ((current.total - previous.total) / previous.total) * 100 : 0;

        return {
          ...current,
          periodLabel: year,
          trend: Math.round(trend),
          trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
      });
    } else if (granularity === 'monthly') {
      const monthlyData = {};
      data.forEach(item => {
        const month = format(parseISO(item.date), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { period: month, total: 0, success: 0, warning: 0, fail: 0, trend: 0 };
        }
        monthlyData[month].total++;
        monthlyData[month][item.status]++;
      });

      const months = Object.keys(monthlyData).sort();
      return months.map((month, index) => {
        const current = monthlyData[month];
        const previous = index > 0 ? monthlyData[months[index - 1]] : null;
        const trend = previous ? ((current.total - previous.total) / previous.total) * 100 : 0;

        return {
          ...current,
          periodLabel: format(parseISO(month + '-01'), 'MMM yyyy'),
          trend: Math.round(trend),
          trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
      });
    } else if (granularity === 'hourly') {
      const hourlyData = {};
      data.forEach(item => {
        const hour = format(parseISO(item.timestamp), 'yyyy-MM-dd HH');
        if (!hourlyData[hour]) {
          hourlyData[hour] = { period: hour, total: 0, success: 0, warning: 0, fail: 0 };
        }
        hourlyData[hour].total++;
        hourlyData[hour][item.status]++;
      });

      const hours = Object.keys(hourlyData).sort();
      return hours.map((hour, index) => {
        const current = hourlyData[hour];
        const previous = index > 0 ? hourlyData[hours[index - 1]] : null;
        const trend = previous ? ((current.total - previous.total) / Math.max(previous.total, 1)) * 100 : 0;

        return {
          ...current,
          periodLabel: format(parseISO(hour + ':00:00'), 'MMM dd HH:mm'),
          trend: Math.round(trend),
          trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
      });
    } else if (granularity === 'daily') {
      const dailyData = {};
      data.forEach(item => {
        if (!dailyData[item.date]) {
          dailyData[item.date] = { period: item.date, total: 0, success: 0, warning: 0, fail: 0 };
        }
        dailyData[item.date].total++;
        dailyData[item.date][item.status]++;
      });

      return dates.map((date, index) => {
        const current = dailyData[date] || { period: date, total: 0, success: 0, warning: 0, fail: 0 };
        const previous = index > 0 ? (dailyData[dates[index - 1]] || { total: 0 }) : null;
        const trend = previous ? ((current.total - previous.total) / Math.max(previous.total, 1)) * 100 : 0;

        return {
          ...current,
          periodLabel: format(parseISO(date), 'MMM dd'),
          trend: Math.round(trend),
          trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
      });
    } else { // weekly or other
      // Weekly view (default)
      const firstDate = parseISO(dates[0]);
      const lastDate = parseISO(dates[dates.length - 1]);
      const weekIntervals = eachWeekOfInterval({ start: firstDate, end: lastDate });

      return weekIntervals.map((week, index) => {
        const weekStart = startOfWeek(week);
        const weekEnd = endOfWeek(week);
        const weekData = { period: format(week, 'yyyy-MM-dd'), total: 0, success: 0, warning: 0, fail: 0 };
        week.forEach(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          const dayEvents = data.filter(d => d.date === dayString);
          dayEvents.forEach(event => {
            weekData.total++;
            weekData[event.status]++;
          });
        });

        const previousWeek = index > 0 ? weekIntervals[index - 1] : null;
        let trend = 0;
        if (previousWeek) {
          const prevWeekStart = startOfWeek(previousWeek);
          const prevWeekEnd = endOfWeek(previousWeek);
          let prevWeekTotal = 0;
          previousWeek.forEach(day => {
            const dayString = format(day, 'yyyy-MM-dd');
            const dayEvents = data.filter(d => d.date === dayString);
            prevWeekTotal += dayEvents.length;
          });
          trend = prevWeekTotal > 0 ? ((weekData.total - prevWeekTotal) / prevWeekTotal) * 100 : 0;
        }

        return {
          ...weekData,
          periodLabel: format(week, 'MMM dd'),
          trend: Math.round(trend),
          trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
      });
    }
  }, [data, granularity]);

  // Scales
  const xScale = scaleBand({
    domain: processedData.map(d => d.period),
    range: [0, xMax],
    padding: 0.2
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(...processedData.map(d => d.total), 1)],
    range: [yMax, 0]
  });

  const maxTrend = Math.max(...processedData.map(d => Math.abs(d.trend)));
  const trendScale = scaleLinear({
    domain: [-maxTrend, maxTrend],
    range: [yMax, 0]
  });

  return (
    <div className="bar-graph-container">
      <div className="chart-header">
        <h3><BarChart3 size={20} /> Activity Trends</h3>
        <div className="chart-controls">
          <button className="chart-control-btn" title="Export Chart">
            <Download size={16} />
          </button>
          <button className="chart-control-btn" title="Fullscreen">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <svg width={width} height={height}>
        <defs>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="warningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eab308" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="failGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {yScale.ticks(5).map(tick => (
            <g key={`grid-${tick}`}>
              <line
                x1={0}
                y1={yScale(tick)}
                x2={xMax}
                y2={yScale(tick)}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <text
                x={-10}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fill="#6b7280"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {processedData.map((d, i) => {
            if (i % Math.ceil(processedData.length / 8) === 0) {
              return (
                <text
                  key={`x-label-${d.period}`}
                  x={(xScale(d.period) || 0) + xScale.bandwidth() / 2}
                  y={yMax + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#374151"
                  fontWeight={500}
                >
                  {d.periodLabel}
                </text>
              );
            }
            return null;
          })}

          {/* Bars with stacked segments */}
          {processedData.map((d) => {
            const barX = xScale(d.period) || 0;
            const barWidth = xScale.bandwidth();

            // Calculate heights for stacked bars
            const failHeight = (d.fail / d.total) * (yMax - yScale(d.total));
            const warningHeight = (d.warning / d.total) * (yMax - yScale(d.total));
            const successHeight = (d.success / d.total) * (yMax - yScale(d.total));

            const failY = yScale(d.total);
            const warningY = failY + failHeight;
            const successY = warningY + warningHeight;

            return (
              <g key={`bar-${d.period}`}>
                {/* Fail segment */}
                {d.fail > 0 && (
                  <rect
                    x={barX}
                    y={failY}
                    width={barWidth}
                    height={failHeight}
                    fill="url(#failGradient)"
                    stroke="#ef4444"
                    strokeWidth={1}
                    className="bar-segment"
                    onMouseEnter={(event) => {
                      const point = localPoint(event) || { x: 0, y: 0 };
                      showTooltip({
                        tooltipData: { ...d, segment: 'fail', value: d.fail },
                        tooltipTop: point.y,
                        tooltipLeft: point.x,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  />
                )}

                {/* Warning segment */}
                {d.warning > 0 && (
                  <rect
                    x={barX}
                    y={warningY}
                    width={barWidth}
                    height={warningHeight}
                    fill="url(#warningGradient)"
                    stroke="#eab308"
                    strokeWidth={1}
                    className="bar-segment"
                    onMouseEnter={(event) => {
                      const point = localPoint(event) || { x: 0, y: 0 };
                      showTooltip({
                        tooltipData: { ...d, segment: 'warning', value: d.warning },
                        tooltipTop: point.y,
                        tooltipLeft: point.x,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  />
                )}

                {/* Success segment */}
                {d.success > 0 && (
                  <rect
                    x={barX}
                    y={successY}
                    width={barWidth}
                    height={successHeight}
                    fill="url(#successGradient)"
                    stroke="#22c55e"
                    strokeWidth={1}
                    className="bar-segment"
                    onMouseEnter={(event) => {
                      const point = localPoint(event) || { x: 0, y: 0 };
                      showTooltip({
                        tooltipData: { ...d, segment: 'success', value: d.success },
                        tooltipTop: point.y,
                        tooltipLeft: point.x,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  />
                )}

                {/* Total count label */}
                {d.total > 0 && (
                  <text
                    x={barX + barWidth / 2}
                    y={yScale(d.total) - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="bold"
                    fill="#374151"
                  >
                    {d.total}
                  </text>
                )}

                {/* Trend indicator */}
                {showTrends && d.trend !== 0 && (
                  <g>
                    {d.trendDirection === 'up' ? (
                      <TrendingUp
                        x={barX + barWidth - 12}
                        y={yScale(d.total) - 20}
                        size={10}
                        color="#22c55e"
                      />
                    ) : d.trendDirection === 'down' ? (
                      <TrendingDown
                        x={barX + barWidth - 12}
                        y={yScale(d.total) - 20}
                        size={10}
                        color="#ef4444"
                      />
                    ) : null}
                    <text
                      x={barX + barWidth / 2}
                      y={yScale(d.total) - 25}
                      textAnchor="middle"
                      fontSize={8}
                      fill={d.trendDirection === 'up' ? '#22c55e' : d.trendDirection === 'down' ? '#ef4444' : '#6b7280'}
                      fontWeight="600"
                    >
                      {d.trend > 0 ? '+' : ''}{d.trend}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Y-axis line */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={yMax}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* X-axis line */}
          <line
            x1={0}
            y1={yMax}
            x2={xMax}
            y2={yMax}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* Y-axis label */}
          <text
            x={-60}
            y={yMax / 2}
            textAnchor="middle"
            fontSize={14}
            fontWeight="600"
            fill="#374151"
            transform={`rotate(-90, -60, ${yMax / 2})`}
          >
            Event Count
          </text>

          {/* X-axis label */}
          <text
            x={xMax / 2}
            y={yMax + 60}
            textAnchor="middle"
            fontSize={14}
            fontWeight="600"
            fill="#374151"
          >
            Time Period ({granularity})
          </text>
        </g>
      </svg>

      {tooltipData && (
        <Tooltip
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxWidth: '250px'
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-header">
              <strong>{tooltipData.periodLabel}</strong>
              <span className="tooltip-trend">
                {tooltipData.trendDirection === 'up' ? '📈' : tooltipData.trendDirection === 'down' ? '📉' : '➡️'}
                {tooltipData.trend > 0 ? '+' : ''}{tooltipData.trend}%
              </span>
            </div>
            <div className="tooltip-body">
              <p>📊 Total: {tooltipData.total} events</p>
              <p>✅ Success: {tooltipData.success}</p>
              <p>⚠️ Warning: {tooltipData.warning}</p>
              <p>❌ Failed: {tooltipData.fail}</p>
              {tooltipData.segment && (
                <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
                  Selected: {tooltipData.segment} ({tooltipData.value})
                </p>
              )}
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}));

const HeatmapChart = memo(withTooltip(({
  data,
  width = 1000,
  height = 500,
  showTooltip,
  hideTooltip,
  tooltipData,
  tooltipTop,
  tooltipLeft,
  onCellClick,
  showGradient = true,
  showAccessibilityPatterns = false,
  granularity // Added granularity prop
}) => {
  const margin = { top: 80, right: 40, bottom: 60, left: 220 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Memoize expensive calculations
  const activityTypes = useMemo(() => Array.from(new Set(data.map(d => d.activityType))), [data]);
  const dates = useMemo(() => Array.from(new Set(data.map(d => d.date))).sort(), [data]);

  // Create weekly bins
  const weeks = useMemo(() => {
    if (dates.length === 0) return [];
    const firstDate = parseISO(dates[0]);
    const lastDate = parseISO(dates[dates.length - 1]);
    return eachWeekOfInterval({ start: firstDate, end: lastDate });
  }, [dates]);

  // Create appropriate scale based on granularity
  const getXScale = () => {
    if (granularity === 'yearly') {
      const years = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy')))).sort();
      return scaleBand({
        domain: years,
        range: [0, xMax],
        padding: 0.02
      });
    } else if (granularity === 'hourly') {
      const hours = Array.from(new Set(data.map(item => format(parseISO(item.timestamp), 'yyyy-MM-dd HH')))).sort();
      return scaleBand({
        domain: hours,
        range: [0, xMax],
        padding: 0.02
      });
    } else if (granularity === 'daily') {
      return scaleBand({
        domain: dates,
        range: [0, xMax],
        padding: 0.02
      });
    } else if (granularity === 'monthly') {
      const months = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy-MM')))).sort();
      return scaleBand({
        domain: months,
        range: [0, xMax],
        padding: 0.02
      });
    } else { // weekly or other
      return scaleBand({
        domain: weeks.map(week => format(week, 'yyyy-MM-dd')),
        range: [0, xMax],
        padding: 0.02
      });
    }
  };

  const xScale = useMemo(() => getXScale(), [dates, weeks, granularity, xMax]);

  const yScale = scaleBand({
    domain: activityTypes,
    range: [0, yMax],
    padding: 0.02
  });

  // Memoize the processed data - fix hooks issue by moving processing inside useMemo
  const gridData = useMemo(() => {
    if (granularity === 'yearly') {
      // Yearly view - group by years
      const years = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy'))));
      return activityTypes.map(activityType => {
        return years.map(year => {
          const yearEvents = data.filter(d => {
            const eventYear = format(parseISO(d.date), 'yyyy');
            return eventYear === year && d.activityType === activityType;
          });

          let status = null;
          let intensity = 0;
          if (yearEvents.length > 0) {
            const statusCounts = yearEvents.reduce((acc, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {});

            if (statusCounts.fail) status = 'fail';
            else if (statusCounts.warning) status = 'warning';
            else status = 'success';

            intensity = yearEvents.length / Math.max(...years.map(y =>
              data.filter(item => format(parseISO(item.date), 'yyyy') === y && item.activityType === activityType).length
            ), 1);
          }

          return {
            activityType,
            period: year,
            periodLabel: year,
            status,
            events: yearEvents,
            count: yearEvents.length,
            intensity
          };
        });
      }).flat();
    } else if (granularity === 'hourly') {
      // Hourly view - group by hours
      const hours = Array.from(new Set(data.map(item => format(parseISO(item.timestamp), 'yyyy-MM-dd HH'))));
      return activityTypes.map(activityType => {
        return hours.map(hour => {
          const hourEvents = data.filter(d => {
            const eventHour = format(parseISO(d.timestamp), 'yyyy-MM-dd HH');
            return eventHour === hour && d.activityType === activityType;
          });

          let status = null;
          let intensity = 0;
          if (hourEvents.length > 0) {
            const statusCounts = hourEvents.reduce((acc, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {});

            if (statusCounts.fail) status = 'fail';
            else if (statusCounts.warning) status = 'warning';
            else status = 'success';

            intensity = hourEvents.length / Math.max(...hours.map(h =>
              data.filter(item => format(parseISO(item.timestamp), 'yyyy-MM-dd HH') === h && item.activityType === activityType).length
            ), 1);
          }

          return {
            activityType,
            period: hour,
            periodLabel: format(parseISO(hour + ':00:00'), 'MMM dd HH:mm'),
            status,
            events: hourEvents,
            count: hourEvents.length,
            intensity
          };
        });
      }).flat();
    } else if (granularity === 'daily') {
      // Daily view - group by individual days
      return activityTypes.map(activityType => {
        return dates.map(date => {
          const dayEvents = data.filter(d =>
            d.date === date && d.activityType === activityType
          );

          let status = null;
          let intensity = 0;
          if (dayEvents.length > 0) {
            const statusCounts = dayEvents.reduce((acc, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {});

            if (statusCounts.fail) status = 'fail';
            else if (statusCounts.warning) status = 'warning';
            else status = 'success';

            intensity = dayEvents.length / Math.max(...dates.map(d =>
              data.filter(item => item.date === d && item.activityType === activityType).length
            ), 1);
          }

          return {
            activityType,
            period: date,
            periodLabel: format(parseISO(date), 'MMM dd'),
            status,
            events: dayEvents,
            count: dayEvents.length,
            intensity
          };
        });
      }).flat();
    } else if (granularity === 'monthly') {
      // Monthly view - group by months
      const months = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy-MM'))));
      return activityTypes.map(activityType => {
        return months.map(month => {
          const monthEvents = data.filter(d => {
            const eventMonth = format(parseISO(d.date), 'yyyy-MM');
            return eventMonth === month && d.activityType === activityType;
          });

          let status = null;
          let intensity = 0;
          if (monthEvents.length > 0) {
            const statusCounts = monthEvents.reduce((acc, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {});

            if (statusCounts.fail) status = 'fail';
            else if (statusCounts.warning) status = 'warning';
            else status = 'success';

            intensity = monthEvents.length / Math.max(...months.map(m =>
              data.filter(item => format(parseISO(item.date), 'yyyy-MM') === m && item.activityType === activityType).length
            ), 1);
          }

          return {
            activityType,
            period: month,
            periodLabel: format(parseISO(month + '-01'), 'MMM yyyy'),
            status,
            events: monthEvents,
            count: monthEvents.length,
            intensity
          };
        });
      }).flat();
    } else { // weekly or other
      // Weekly view (default)
      return activityTypes.map(activityType => {
        return weeks.map(week => {
          const weekStart = startOfWeek(week);
          const weekEnd = endOfWeek(week);
          const weekKey = format(week, 'yyyy-MM-dd');

          const weekEvents = data.filter(d => {
            const eventDate = parseISO(d.date);
            return d.activityType === activityType &&
                   eventDate >= weekStart &&
                   eventDate <= weekEnd;
          });

          let status = null;
          let intensity = 0;
          if (weekEvents.length > 0) {
            const statusCounts = weekEvents.reduce((acc, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {});

            if (statusCounts.fail) status = 'fail';
            else if (statusCounts.warning) status = 'warning';
            else status = 'success';

            const maxEvents = Math.max(...activityTypes.map(type => {
              const typeWeeks = weeks.map(w => {
                const wStart = startOfWeek(w);
                const wEnd = endOfWeek(w);
                return data.filter(d => {
                  const eventDate = parseISO(d.date);
                  return d.activityType === type &&
                         eventDate >= wStart &&
                         eventDate <= wEnd;
                }).length;
              });
              return Math.max(...typeWeeks, 1);
            }), 1);

            intensity = weekEvents.length / maxEvents;
          }

          return {
            activityType,
            period: weekKey,
            periodLabel: format(week, 'MMM dd'),
            status,
            events: weekEvents,
            count: weekEvents.length,
            intensity
          };
        });
      }).flat();
    }
  }, [data, granularity, activityTypes, dates, weeks]);

  // Intensity color scale
  const getIntensityColor = (status, intensity) => {
    if (!status) return null;
    const baseColor = statusColorMap[status];
    if (!showGradient) return baseColor;

    // Convert hex to rgb and apply opacity based on intensity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const alpha = Math.max(0.3, intensity); // Minimum 0.3 opacity

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getPatternId = (status) => `pattern-${status}`;

  return (
    <div className="heatmap-container">
      <div className="chart-header">
        <h3>Activity Timeline Heatmap</h3>
        <div className="chart-controls">
          <button className="chart-control-btn" title="Export Chart">
            <Download size={16} />
          </button>
          <button className="chart-control-btn" title="Fullscreen">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <svg width={width} height={height} style={{ backgroundColor: '#fafafa' }}>
        <defs>
          {/* Accessibility patterns */}
          <pattern id="pattern-success" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill={statusColorMap.success} />
            <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="white" strokeWidth="0.5" />
          </pattern>
          <pattern id="pattern-warning" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill={statusColorMap.warning} />
            <circle cx="2" cy="2" r="0.5" fill="white" />
          </pattern>
          <pattern id="pattern-fail" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill={statusColorMap.fail} />
            <path d="M 1,1 l 2,2 M 1,3 l 2,-2" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis labels (Activity Types) */}
          {activityTypes.map(activityType => (
            <text
              key={activityType}
              x={-10}
              y={(yScale(activityType) || 0) + yScale.bandwidth() / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="axis-label activity-label"
              fontSize={11}
            >
              {activityType}
            </text>
          ))}

          {/* X-axis labels - Dynamic based on granularity */}
          {(() => {
            if (granularity === 'yearly') {
              const years = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy'))));
              return years.map((year) => (
                <g key={year}>
                  <text
                    x={(xScale(year) || 0) + xScale.bandwidth() / 2}
                    y={-20}
                    textAnchor="middle"
                    className="axis-label year-label"
                    fontSize={14}
                    fill="#374151"
                    fontWeight="600"
                  >
                    {year}
                  </text>
                </g>
              ));
            } else if (granularity === 'hourly') {
              const hours = Array.from(new Set(data.map(item => format(parseISO(item.timestamp), 'yyyy-MM-dd HH'))));
              return hours.map((hour, i) => {
                if (i % 4 === 0) { // Show every 4th hour to avoid overcrowding
                  return (
                    <g key={hour}>
                      <text
                        x={(xScale(hour) || 0) + xScale.bandwidth() / 2}
                        y={-35}
                        textAnchor="middle"
                        className="axis-label"
                        fontSize={10}
                        fill="#374151"
                      >
                        {format(parseISO(hour + ':00:00'), 'MMM dd')}
                      </text>
                      <text
                        x={(xScale(hour) || 0) + xScale.bandwidth() / 2}
                        y={-20}
                        textAnchor="middle"
                        className="axis-label hour-label"
                        fontSize={9}
                        fill="#6b7280"
                      >
                        {format(parseISO(hour + ':00:00'), 'HH:mm')}
                      </text>
                    </g>
                  );
                }
                return null;
              });
            } else if (granularity === 'daily') {
              return dates.map((date, i) => {
                if (i % 3 === 0) {
                  return (
                    <g key={date}>
                      <text
                        x={(xScale(date) || 0) + xScale.bandwidth() / 2}
                        y={-20}
                        textAnchor="middle"
                        className="axis-label"
                        fontSize={10}
                        fill="#374151"
                      >
                        {format(parseISO(date), 'MMM dd')}
                      </text>
                    </g>
                  );
                }
                return null;
              });
            } else if (granularity === 'monthly') {
              const months = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy-MM'))));
              return months.map((month) => (
                <g key={month}>
                  <text
                    x={(xScale(month) || 0) + xScale.bandwidth() / 2}
                    y={-35}
                    textAnchor="middle"
                    className="axis-label month-label"
                    fontSize={12}
                    fill="#374151"
                  >
                    {format(parseISO(month + '-01'), 'MMM')}
                  </text>
                  <text
                    x={(xScale(month) || 0) + xScale.bandwidth() / 2}
                    y={-20}
                    textAnchor="middle"
                    className="axis-label year-label"
                    fontSize={10}
                    fill="#6b7280"
                  >
                    {format(parseISO(month + '-01'), 'yyyy')}
                  </text>
                </g>
              ));
            } else { // weekly or other
              return weeks.map((week, i) => {
                if (i % 2 === 0) {
                  return (
                    <g key={format(week, 'yyyy-MM-dd')}>
                      <text
                        x={(xScale(format(week, 'yyyy-MM-dd')) || 0) + xScale.bandwidth() / 2}
                        y={-35}
                        textAnchor="middle"
                        className="axis-label month-label"
                        fontSize={12}
                        fill="#374151"
                      >
                        {format(week, 'MMM')}
                      </text>
                      <text
                        x={(xScale(format(week, 'yyyy-MM-dd')) || 0) + xScale.bandwidth() / 2}
                        y={-20}
                        textAnchor="middle"
                        className="axis-label year-label"
                        fontSize={10}
                        fill="#6b7280"
                      >
                        {format(week, 'yyyy')}
                      </text>
                    </g>
                  );
                }
                return null;
              });
            }
          })()}

          {/* Grid lines */}
          <g className="grid-lines">
            {(() => {
              if (granularity === 'yearly') {
                const years = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy'))));
                return years.map((year, i) => (
                  <line
                    key={`v-${i}`}
                    x1={xScale(year) || 0}
                    y1={0}
                    x2={xScale(year) || 0}
                    y2={yMax}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  />
                ));
              } else if (granularity === 'hourly') {
                const hours = Array.from(new Set(data.map(item => format(parseISO(item.timestamp), 'yyyy-MM-dd HH'))));
                return hours.map((hour, i) => (
                  <line
                    key={`v-${i}`}
                    x1={xScale(hour) || 0}
                    y1={0}
                    x2={xScale(hour) || 0}
                    y2={yMax}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  />
                ));
              } else if (granularity === 'daily') {
                return dates.map((date, i) => (
                  <line
                    key={`v-${i}`}
                    x1={xScale(date) || 0}
                    y1={0}
                    x2={xScale(date) || 0}
                    y2={yMax}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  />
                ));
              } else if (granularity === 'monthly') {
                const months = Array.from(new Set(dates.map(date => format(parseISO(date), 'yyyy-MM'))));
                return months.map((month, i) => (
                  <line
                    key={`v-${i}`}
                    x1={xScale(month) || 0}
                    y1={0}
                    x2={xScale(month) || 0}
                    y2={yMax}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  />
                ));
              } else { // weekly or other
                return weeks.map((week, i) => (
                  <line
                    key={`v-${i}`}
                    x1={xScale(format(week, 'yyyy-MM-dd')) || 0}
                    y1={0}
                    x2={xScale(format(week, 'yyyy-MM-dd')) || 0}
                    y2={yMax}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  />
                ));
              }
            })()}
            {activityTypes.map((type, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={yScale(type) || 0}
                x2={xMax}
                y2={yScale(type) || 0}
                stroke="#f3f4f6"
                strokeWidth={0.5}
              />
            ))}
          </g>

          {/* Heatmap cells - Optimized rendering */}
          {useMemo(() => {
            const handleShowTooltip = (event, cell) => {
              const point = localPoint(event) || { x: 0, y: 0 };
              showTooltip({
                tooltipData: cell,
                tooltipTop: point.y,
                tooltipLeft: point.x,
              });
            };

            const handleHideTooltip = () => {
              hideTooltip();
            };

            return gridData.map((cell, index) => {
              if (!cell.status) return null;

              const x = xScale(cell.period) || 0;
              const y = yScale(cell.activityType) || 0;
              const width = xScale.bandwidth();
              const height = yScale.bandwidth();
              const fillColor = showGradient
                ? getIntensityColor(cell.status, cell.intensity)
                : statusColorMap[cell.status];

              const centerX = x + width / 2;
              const centerY = y + height / 2;
              const radius = Math.min(width, height) * 0.3;

              return (
                <rect
                  key={`${cell.activityType}-${cell.period}-${index}`}
                  x={x + width * 0.1}
                  y={y + height * 0.1}
                  width={width * 0.8}
                  height={height * 0.8}
                  fill={fillColor}
                  stroke="#ffffff"
                  strokeWidth={1}
                  rx={2}
                  ry={2}
                  onMouseEnter={(event) => handleShowTooltip(event, cell)}
                  onMouseLeave={handleHideTooltip}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCellClick(cell);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              );
            });
          }, [gridData, xScale, yScale, showGradient, showAccessibilityPatterns, showTooltip, hideTooltip, onCellClick])}
        </g>
      </svg>

      {tooltipData && (
        <Tooltip
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxWidth: '250px'
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-header">
              <strong>{tooltipData.activityType}</strong>
              <span className="tooltip-status" style={{ color: statusColorMap[tooltipData.status] }}>
                {statusIcons[tooltipData.status]} {tooltipData.status.toUpperCase()}
              </span>
            </div>
            <div className="tooltip-body">
              <p>📅 {tooltipData.periodLabel}</p>
              <p>📊 {tooltipData.count} events</p>
              <p>💪 Intensity: {Math.round(tooltipData.intensity * 100)}%</p>
              <small>Click for detailed view</small>
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}));

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedActivityTypes, setSelectedActivityTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGradient, setShowGradient] = useState(true);
  const [showAccessibilityPatterns, setShowAccessibilityPatterns] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [granularity, setGranularity] = useState('weekly');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false); // State for the date picker visibility
  const [customDateRange, setCustomDateRange] = useState({ 
    start: '2025-01-01', 
    end: '2026-08-03' 
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Force re-render when granularity changes
  const handleGranularityChange = useCallback((newGranularity) => {
    setGranularity(newGranularity);
  }, []);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'bargraph'
  const [showTrends, setShowTrends] = useState(true);

  const activityTypes = Array.from(new Set(dummyData.map(d => d.activityType)));
  const statuses = ['success', 'warning', 'fail'];

  // Filter activity types by search term
  const filteredActivityTypes = activityTypes.filter(type =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter data based on selected time range and custom date range
  const timeFilteredData = useMemo(() => {
    const now = new Date();
    let startDate = null;

    switch (timeRange) {
      case 'last24hours':
        startDate = subDays(now, 1);
        break;
      case 'last7days':
        startDate = subDays(now, 7);
        break;
      case 'last30days':
        startDate = subDays(now, 30);
        break;
      case 'last90days':
        startDate = subDays(now, 90);
        break;
      case 'lastYear':
        startDate = subDays(now, 365);
        break;
      case 'all': // Added case for 'all'
        startDate = new Date(0); // Set start date to the beginning of time
        break;
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          startDate = parseISO(customDateRange.start);
          const endDate = parseISO(customDateRange.end);
          return dummyData.filter(item => {
            const itemDate = parseISO(item.date);
            return itemDate >= startDate && itemDate <= endDate;
          });
        } else {
          // If custom range is selected but not set, return empty or default
          return [];
        }
      default:
        startDate = subDays(now, 30); // Default to last 30 days
    }

    if (startDate) {
      return dummyData.filter(item => {
        const itemDate = parseISO(item.date);
        return itemDate >= startDate && itemDate <= now;
      });
    }
    return [];
  }, [timeRange, customDateRange]);


  // Optimized filter data calculation
  const filteredData = useMemo(() => {
    // Early return if no filters
    if (selectedActivityTypes.length === 0 && selectedStatuses.length === 0 && !selectedStatCard) {
      return timeFilteredData; // Use time-filtered data
    }

    return timeFilteredData.filter(item => { // Filter from time-filtered data
      // Activity type filter
      if (selectedActivityTypes.length > 0 && !selectedActivityTypes.includes(item.activityType)) {
        return false;
      }

      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }

      // Stat card filter
      if (selectedStatCard) {
        const targetStatus = selectedStatCard === 'failed' ? 'fail' : selectedStatCard;
        if (targetStatus !== 'total' && item.status !== targetStatus) {
          return false;
        }
      }

      return true;
    });
  }, [timeFilteredData, selectedActivityTypes, selectedStatuses, selectedStatCard]);


  // Calculate statistics
  const statistics = useMemo(() => {
    const devices = new Set(filteredData.map(d => d.device)).size;
    const users = new Set(filteredData.map(d => d.user)).size;
    const totalEvents = filteredData.length;
    const successEvents = filteredData.filter(d => d.status === 'success').length;
    const failedEvents = filteredData.filter(d => d.status === 'fail').length;
    const warningEvents = filteredData.filter(d => d.status === 'warning').length;

    return {
      devices,
      users,
      totalEvents,
      successEvents,
      failedEvents,
      warningEvents,
      successRate: totalEvents > 0 ? ((successEvents / totalEvents) * 100).toFixed(1) : 0
    };
  }, [filteredData]);

  const handleActivityTypeFilter = (activityType) => {
    setSelectedActivityTypes(prev =>
      prev.includes(activityType)
        ? prev.filter(a => a !== activityType)
        : [...prev, activityType]
    );
  };

  const handleStatusFilter = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setSelectedActivityTypes([]);
    setSelectedStatuses([]);
    setSelectedStatCard(null);
    setSearchTerm('');
  };

  // Export functionality
  const exportData = useCallback((format) => {
    setIsExporting(true);

    setTimeout(() => {
      if (format === 'csv') {
        const csvData = filteredData.map(item => ({
          Date: item.date,
          Time: format(parseISO(item.timestamp), 'HH:mm:ss'),
          Activity: item.activityType,
          Status: item.status,
          User: item.user,
          Device: item.device
        }));

        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        const jsonData = {
          exported_at: new Date().toISOString(),
          total_events: filteredData.length,
          filters_applied: {
            activity_types: selectedActivityTypes,
            statuses: selectedStatuses,
            date_range: timeRange
          },
          data: filteredData
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setIsExporting(false);
      addNotification('Export completed successfully!', 'success');
    }, 1000);
  }, [filteredData, selectedActivityTypes, selectedStatuses, timeRange]);

  // Real-time updates simulation
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Simulate new data notification
      if (Math.random() > 0.7) {
        addNotification('New activity detected!', 'info');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled]);

  // Notification system
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Advanced analytics calculations
  const advancedAnalytics = useMemo(() => {
    const hourlyDistribution = Array(24).fill(0);
    const dailyTrends = {};
    const userActivityMap = {};
    const deviceUsage = {};

    filteredData.forEach(item => {
      const hour = parseISO(item.timestamp).getHours();
      hourlyDistribution[hour]++;

      const day = format(parseISO(item.date), 'yyyy-MM-dd');
      dailyTrends[day] = (dailyTrends[day] || 0) + 1;

      userActivityMap[item.user] = (userActivityMap[item.user] || 0) + 1;
      deviceUsage[item.device] = (deviceUsage[item.device] || 0) + 1;
    });

    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const mostActiveUser = Object.entries(userActivityMap).sort(([,a], [,b]) => b - a)[0];
    const mostUsedDevice = Object.entries(deviceUsage).sort(([,a], [,b]) => b - a)[0];

    return {
      peakHour,
      mostActiveUser: mostActiveUser ? mostActiveUser[0] : 'N/A',
      mostUsedDevice: mostUsedDevice ? mostUsedDevice[0] : 'N/A',
      hourlyDistribution,
      dailyTrends,
      averageEventsPerDay: Object.values(dailyTrends).reduce((a, b) => a + b, 0) / Object.keys(dailyTrends).length || 0
    };
  }, [filteredData]);

  // Optimized cell click handler with immediate response
  const handleCellClick = useCallback((cell) => {
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      setSelectedCell(cell);
    });
  }, []);

  // Throttled version for rapid clicks with better performance
  const optimizedCellClick = useThrottle(handleCellClick, 50);

  // Function to render chart based on current settings and tab
  const renderChart = (data, tabName = activeTab) => {
    // Use the provided data parameter directly, which is already filtered
    const chartData = data;

    if (chartData.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-content">
            <Activity size={48} className="empty-icon" />
            <h3>No {tabName.toLowerCase()} data to display</h3>
            <p>Try adjusting your filters or check back later for new {tabName.toLowerCase()} events.</p>
            <button className="clear-filters" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          </div>
        </div>
      );
    }

    return viewMode === 'heatmap' ? (
      <HeatmapChart
        data={chartData}
        width={1200}
        height={600}
        onCellClick={optimizedCellClick}
        showGradient={showGradient}
        showAccessibilityPatterns={showAccessibilityPatterns}
        granularity={granularity}
      />
    ) : (
      <BarGraph
        data={chartData}
        width={1200}
        height={600}
        granularity={granularity}
        showTrends={showTrends}
      />
    );
  };

  const closeDetailsModal = () => {
    setSelectedCell(null);
  };

  const handleStatCardClick = (statType) => {
    setSelectedStatCard(prev => prev === statType ? null : statType);
  };

  const removeFilterChip = (type, value) => {
    if (type === 'activityType') {
      setSelectedActivityTypes(prev => prev.filter(a => a !== value));
    } else if (type === 'status') {
      setSelectedStatuses(prev => prev.filter(s => s !== value));
    } else if (type === 'statCard') {
      setSelectedStatCard(null);
    }
  };

  const getActiveFilters = () => {
    const filters = [];
    selectedActivityTypes.forEach(type => filters.push({ type: 'activityType', value: type, label: type }));
    selectedStatuses.forEach(status => filters.push({
      type: 'status',
      value: status,
      label: `${statusIcons[status]} ${status}`,
      color: statusColorMap[status]
    }));
    if (selectedStatCard) {
      filters.push({
        type: 'statCard',
        value: selectedStatCard,
        label: `${selectedStatCard} events`,
        color: statusColorMap[selectedStatCard === 'failed' ? 'fail' : selectedStatCard]
      });
    }
    return filters;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Activity Timeline Dashboard</h1>
        <div className="header-controls">
          <div className="view-mode-controls">
            <button
              className={`view-mode-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode('heatmap')}
              title="Heatmap View"
            >
              <Activity size={14} />
              Heatmap
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'bargraph' ? 'active' : ''}`}
              onClick={() => setViewMode('bargraph')}
              title="Bar Graph View"
            >
              <BarChart3 size={14} />
              Bar Graph
            </button>
          </div>

          <div className="advanced-controls">
            <button
              className={`filter-toggle ${isRealTimeEnabled ? 'active' : ''}`}
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              title="Real-time Updates"
            >
              <RefreshCw size={14} className={isRealTimeEnabled ? 'spinning' : ''} />
              Live
            </button>

            <button
              className={`filter-toggle ${showAnalytics ? 'active' : ''}`}
              onClick={() => setShowAnalytics(!showAnalytics)}
              title="Advanced Analytics"
            >
              <BarChart3 size={14} />
              Analytics
            </button>

            <div className="export-dropdown">
              <button
                className={`filter-toggle ${showDateRangePicker ? 'active' : ''}`}
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                title="Select Date Range"
              >
                <Calendar size={14} />
                Date Range
              </button>
            </div>

            <button
              className={`filter-toggle ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
              title="Live Preview"
            >
              <Eye size={14} />
              Preview
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.type}`}>
              <div className="notification-content">
                <div className="notification-icon">
                  {notification.type === 'success' && <Zap size={16} />}
                  {notification.type === 'info' && <Bell size={16} />}
                  {notification.type === 'warning' && <AlertTriangle size={16} />}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {format(notification.timestamp, 'HH:mm:ss')}
                </div>
              </div>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Status Bar */}
      {isRealTimeEnabled && (
        <div className="realtime-status">
          <div className="status-indicator live"></div>
          <span>Live Updates Active</span>
          <span className="last-update">Last update: {format(lastUpdate, 'HH:mm:ss')}</span>
        </div>
      )}

      {/* Active Filters Chips */}
      {getActiveFilters().length > 0 && (
        <div className="filter-chips-container">
          <div className="filter-chips-header">
            <span className="filter-chips-label">Active Filters:</span>
            <button className="clear-all-chips" onClick={clearAllFilters}>
              <RotateCcw size={14} />
              Clear All
            </button>
          </div>
          <div className="filter-chips">
            {getActiveFilters().map((filter, index) => (
              <div key={index} className="filter-chip" style={{ borderColor: filter.color }}>
                <span>{filter.label}</span>
                <button
                  className="remove-chip"
                  onClick={() => removeFilterChip(filter.type, filter.value)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Dashboard - Clickable */}
      <div className="stats-dashboard">
        <div
          className={`stat-card ${selectedStatCard === 'total' ? 'selected' : ''}`}
          onClick={() => handleStatCardClick('total')}
        >
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.totalEvents}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-trend">📈</div>
        </div>

        <div
          className={`stat-card success ${selectedStatCard === 'success' ? 'selected' : ''}`}
          onClick={() => handleStatCardClick('success')}
        >
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.successEvents}</div>
            <div className="stat-label">Success Events</div>
          </div>
          <div className="stat-trend">✅</div>
        </div>

        <div
          className={`stat-card failed ${selectedStatCard === 'failed' ? 'selected' : ''}`}
          onClick={() => handleStatCardClick('failed')}
        >
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.failedEvents}</div>
            <div className="stat-label">Failed Events</div>
          </div>
          <div className="stat-trend">❌</div>
        </div>

        <div
          className={`stat-card warning ${selectedStatCard === 'warning' ? 'selected' : ''}`}
          onClick={() => handleStatCardClick('warning')}
        >
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.warningEvents}</div>
            <div className="stat-label">Warning Events</div>
          </div>
          <div className="stat-trend">⚠️</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.devices}</div>
            <div className="stat-label">Devices</div>
          </div>
          <div className="stat-trend">📱</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.users}</div>
            <div className="stat-label">Users</div>
          </div>
          <div className="stat-trend">👥</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.successRate}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
          <div className="stat-trend">📊</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Overview' && <span className="tab-indicator">🏠</span>}
          </button>
        ))}
      </nav>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <span className="filter-group-label">Time View:</span>
          <div className="filter-buttons">
            <button
              className={`filter-icon-btn ${granularity === 'monthly' ? 'active' : ''}`}
              onClick={() => handleGranularityChange('monthly')}
              title="View by Month"
            >
              <Calendar size={16} />
            </button>
            <button
              className={`filter-icon-btn ${granularity === 'weekly' ? 'active' : ''}`}
              onClick={() => handleGranularityChange('weekly')}
              title="View by Week"
            >
              <Activity size={16} />
            </button>
            <button
              className={`filter-icon-btn ${granularity === 'daily' ? 'active' : ''}`}
              onClick={() => handleGranularityChange('daily')}
              title="View by Day"
            >
              <Calendar size={16} />
            </button>
            <button
              className={`filter-icon-btn ${granularity === 'hourly' ? 'active' : ''}`}
              onClick={() => setGranularity('hourly')}
              title="View by Hour"
            >
              <Users size={16} />
            </button>
            <button
              className={`filter-icon-btn ${granularity === 'yearly' ? 'active' : ''}`}
              onClick={() => handleGranularityChange('yearly')}
              title="View by Year"
            >
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <div className="filter-divider"></div>

        <div className="filter-group">
          <span className="filter-group-label">Data:</span>
          <div className="filter-buttons">
            <button
              className={`filter-icon-btn ${showFilters ? 'active' : ''}`}
              onClick={() => {
                setShowFilters(!showFilters);
                setShowCustomize(false);
              }}
              title="Toggle Filters"
            >
              <Filter size={16} />
              {(selectedActivityTypes.length > 0 || selectedStatuses.length > 0) && (
                <span className="filter-badge">{selectedActivityTypes.length + selectedStatuses.length}</span>
              )}
            </button>
            <button
              className={`filter-icon-btn ${showCustomize ? 'active' : ''}`}
              onClick={() => {
                setShowCustomize(!showCustomize);
                setShowFilters(false);
              }}
              title="Chart Settings"
            >
              <Activity size={16} />
            </button>
            <button
              className="filter-icon-btn"
              onClick={clearAllFilters}
              title="Clear All Filters"
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="filter-icon-btn"
              onClick={() => window.location.reload()}
              title="Refresh Data"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="filter-divider"></div>

        <div className="filter-group">
          <span className="filter-group-label">Export:</span>
          <div className="filter-buttons">
            <button
              className="filter-icon-btn"
              onClick={() => exportData('csv')}
              title="Export Data as CSV"
              disabled={isExporting}
            >
              <Download size={16} />
            </button>
            <button
              className="filter-icon-btn"
              onClick={() => exportData('json')}
              title="Export Data as JSON"
              disabled={isExporting}
            >
              <Download size={16} />
            </button>
            <button
              className="filter-icon-btn"
              title="Fullscreen View"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="mobile-filter-menu">
          <button
            className="filter-icon-btn mobile-menu-btn"
            onClick={() => setShowFilters(!showFilters)}
            title="Filter Menu"
          >
            <Filter size={16} />
            <span className="mobile-menu-text">Menu</span>
          </button>
        </div>
      </div>

      {/* Floating Customize Popover */}
      {showCustomize && (
        <>
          <div className="filter-overlay" onClick={() => setShowCustomize(false)} />
          <div className="customize-popover">
            <div className="filter-popover-header">
              <h3><Activity size={16} /> Chart Settings</h3>
              <button className="close-popover" onClick={() => setShowCustomize(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="filter-popover-content">
              <div className="filter-section compact">
                <h4><Calendar size={12} /> Time Range</h4>
                <div className="customize-options compact">
                  <label className="customize-option compact">
                    <span>Time Period</span>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="time-select compact"
                    >
                      <option value="last24hours">Last 24 Hours</option>
                      <option value="last7days">Last 7 Days</option>
                      <option value="last30days">Last 30 Days</option>
                      <option value="last90days">Last 90 Days</option>
                      <option value="lastYear">Last Year</option>
                      <option value="all">All Time</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </label>
                  <label className="customize-option compact">
                    <span>View Granularity</span>
                    <div className="granularity-controls compact">
                      {['hourly', 'daily', 'weekly', 'monthly', 'yearly'].map(gran => (
                        <button
                          key={gran}
                          className={`granularity-btn compact ${granularity === gran ? 'active' : ''}`}
                          onClick={() => handleGranularityChange(gran)}
                        >
                          {gran.charAt(0).toUpperCase() + gran.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              </div>

              <div className="filter-section compact">
                <h4><Eye size={12} /> Chart Options</h4>
                <div className="customize-options compact">
                  <label className="customize-option compact checkbox">
                    <input
                      type="checkbox"
                      checked={showGradient}
                      onChange={(e) => setShowGradient(e.target.checked)}
                    />
                    <span>Gradient Intensity</span>
                  </label>
                  <label className="customize-option compact checkbox">
                    <input
                      type="checkbox"
                      checked={showAccessibilityPatterns}
                      onChange={(e) => setShowAccessibilityPatterns(e.target.checked)}
                    />
                    <span>Accessibility Patterns</span>
                  </label>
                  <label className="customize-option compact checkbox">
                    <input type="checkbox" defaultChecked />
                    <span>Show Event Counts</span>
                  </label>
                  <label className="customize-option compact checkbox">
                    <input type="checkbox" defaultChecked />
                    <span>Grid Lines</span>
                  </label>
                  {viewMode === 'bargraph' && (
                    <label className="customize-option compact checkbox">
                      <input
                        type="checkbox"
                        checked={showTrends}
                        onChange={(e) => setShowTrends(e.target.checked)}
                      />
                      <span>Show Trend Indicators</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="filter-actions compact">
                <button className="apply-filters compact" onClick={() => setShowCustomize(false)}>
                  <Activity size={12} />
                  Apply & Close
                </button>
                <button className="clear-filters compact" onClick={() => {
                  setShowGradient(true);
                  setShowAccessibilityPatterns(false);
                  setGranularity('weekly');
                  setTimeRange('all'); // Changed to 'all'
                }}>
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Filter Popover */}
      {showFilters && (
        <>
          <div className="filter-overlay" onClick={() => setShowFilters(false)} />
          <div className="filter-popover">
            <div className="filter-popover-header">
              <h3><Filter size={16} /> Filters</h3>
              <button className="close-popover" onClick={() => setShowFilters(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="filter-popover-content">
              <div className="filter-section compact">
                <h4><Activity size={12} /> Activity Types</h4>
                <div className="search-container compact">
                  <Search size={12} />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input compact"
                  />
                </div>
                <div className="filter-options compact scrollable">
                  <label className="filter-option compact select-all">
                    <input
                      type="checkbox"
                      checked={selectedActivityTypes.length === activityTypes.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedActivityTypes([...activityTypes]);
                        } else {
                          setSelectedActivityTypes([]);
                        }
                      }}
                    />
                    <strong>Select All ({activityTypes.length})</strong>
                  </label>
                  {filteredActivityTypes.slice(0, 8).map(type => (
                    <label key={type} className="filter-option compact">
                      <input
                        type="checkbox"
                        checked={selectedActivityTypes.includes(type)}
                        onChange={() => handleActivityTypeFilter(type)}
                      />
                      <span className="activity-name">{type}</span>
                      <span className="activity-count">
                        {dummyData.filter(d => d.activityType === type).length}
                      </span>
                    </label>
                  ))}
                  {filteredActivityTypes.length > 8 && (
                    <div className="more-items">
                      +{filteredActivityTypes.length - 8} more items
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-section compact">
                <h4><Eye size={12} /> Status</h4>
                <div className="filter-options compact">
                  {statuses.map(status => (
                    <label key={status} className="filter-option compact enhanced">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={() => handleStatusFilter(status)}
                      />
                      <span className="status-indicator compact" style={{ backgroundColor: statusColorMap[status] }}>
                        {statusIcons[status]}
                      </span>
                      <span className="status-name">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      <span className="status-count">
                        {dummyData.filter(d => d.status === status).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-actions compact">
                <button className="apply-filters compact" onClick={() => setShowFilters(false)}>
                  <Activity size={12} />
                  Apply & Close
                </button>
                <button className="clear-filters compact" onClick={clearAllFilters}>
                  <RotateCcw size={12} />
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Date Range Picker */}
      {showDateRangePicker && (
        <>
          <div className="filter-overlay" onClick={() => setShowDateRangePicker(false)} />
          <div className="date-range-picker">
            <div className="date-picker-header">
              <h3><Calendar size={16} /> Custom Date Range</h3>
              <button className="close-popover" onClick={() => setShowDateRangePicker(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="date-picker-content">
              <div className="date-picker-info">
                <p>Select a custom date range to filter your data. Format: DD.MM.YYYY</p>
                <div className="date-range-examples">
                  <strong>Examples:</strong>
                  <span>01.01.2025 - 31.12.2025</span>
                  <span>15.03.2024 - 15.09.2024</span>
                </div>
              </div>

              <div className="date-inputs">
                <div className="date-input-group">
                  <label htmlFor="start-date">From Date</label>
                  <input
                    id="start-date"
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setCustomDateRange(prev => ({ ...prev, start: newStart }));
                      if (newStart && customDateRange.end) {
                        setTimeRange('custom');
                        addNotification(`Date range auto-applied: ${format(parseISO(newStart), 'dd.MM.yyyy')} - ${format(parseISO(customDateRange.end), 'dd.MM.yyyy')}`, 'success');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDateRange.start && customDateRange.end) {
                        setTimeRange('custom');
                        setShowDateRangePicker(false);
                        addNotification(`Date range applied: ${format(parseISO(customDateRange.start), 'dd.MM.yyyy')} - ${format(parseISO(customDateRange.end), 'dd.MM.yyyy')}`, 'success');
                      }
                    }}
                    className="date-input"
                    max={customDateRange.end || format(new Date(), 'yyyy-MM-dd')}
                  />
                  <span className="date-display">
                    {customDateRange.start ? format(parseISO(customDateRange.start), 'dd.MM.yyyy') : 'Select start date'}
                  </span>
                </div>

                <div className="date-range-separator">
                  <span>to</span>
                </div>

                <div className="date-input-group">
                  <label htmlFor="end-date">To Date</label>
                  <input
                    id="end-date"
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setCustomDateRange(prev => ({ ...prev, end: newEnd }));
                      if (customDateRange.start && newEnd) {
                        setTimeRange('custom');
                        addNotification(`Date range auto-applied: ${format(parseISO(customDateRange.start), 'dd.MM.yyyy')} - ${format(parseISO(newEnd), 'dd.MM.yyyy')}`, 'success');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDateRange.start && customDateRange.end) {
                        setTimeRange('custom');
                        setShowDateRangePicker(false);
                        addNotification(`Date range applied: ${format(parseISO(customDateRange.start), 'dd.MM.yyyy')} - ${format(parseISO(customDateRange.end), 'dd.MM.yyyy')}`, 'success');
                      }
                    }}
                    className="date-input"
                    min={customDateRange.start}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  <span className="date-display">
                    {customDateRange.end ? format(parseISO(customDateRange.end), 'dd.MM.yyyy') : 'Select end date'}
                  </span>
                </div>
              </div>

              <div className="quick-range-buttons">
                <h4>Quick Ranges</h4>
                <div className="quick-buttons">
                  <button
                    className="quick-range-btn"
                    onClick={() => {
                      const end = format(new Date(), 'yyyy-MM-dd');
                      const start = format(subDays(new Date(), 7), 'yyyy-MM-dd');
                      setCustomDateRange({ start, end });
                      setTimeRange('custom');
                      addNotification(`Quick range applied: Last 7 Days`, 'success');
                    }}
                  >
                    Last 7 Days
                  </button>
                  <button
                    className="quick-range-btn"
                    onClick={() => {
                      const end = format(new Date(), 'yyyy-MM-dd');
                      const start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
                      setCustomDateRange({ start, end });
                      setTimeRange('custom');
                      addNotification(`Quick range applied: Last 30 Days`, 'success');
                    }}
                  >
                    Last 30 Days
                  </button>
                  <button
                    className="quick-range-btn"
                    onClick={() => {
                      const end = format(new Date(), 'yyyy-MM-dd');
                      const start = format(subDays(new Date(), 90), 'yyyy-MM-dd');
                      setCustomDateRange({ start, end });
                      setTimeRange('custom');
                      addNotification(`Quick range applied: Last 3 Months`, 'success');
                    }}
                  >
                    Last 3 Months
                  </button>
                  <button
                    className="quick-range-btn"
                    onClick={() => {
                      const end = format(new Date(), 'yyyy-MM-dd');
                      const start = format(subDays(new Date(), 365), 'yyyy-MM-dd');
                      setCustomDateRange({ start, end });
                      setTimeRange('custom');
                      addNotification(`Quick range applied: Last Year`, 'success');
                    }}
                  >
                    Last Year
                  </button>
                  <button
                    className="quick-range-btn"
                    onClick={() => {
                      setCustomDateRange({ start: '2025-01-01', end: '2026-08-03' });
                      setTimeRange('custom');
                      addNotification(`Quick range applied: 2025-2026`, 'success');
                    }}
                  >
                    2025-2026
                  </button>
                </div>
              </div>

              <div className="date-range-summary">
                {customDateRange.start && customDateRange.end && (
                  <div className="range-summary">
                    <strong>Selected Range:</strong>
                    <span className="range-text">
                      {format(parseISO(customDateRange.start), 'dd.MM.yyyy')} - {format(parseISO(customDateRange.end), 'dd.MM.yyyy')}
                    </span>
                    <span className="range-duration">
                      ({Math.ceil((parseISO(customDateRange.end) - parseISO(customDateRange.start)) / (1000 * 60 * 60 * 24))} days)
                    </span>
                  </div>
                )}
              </div>

              <div className="date-picker-actions">
                <button
                  className="apply-date-range"
                  onClick={() => {
                    if (customDateRange.start && customDateRange.end) {
                      setTimeRange('custom');
                      setShowDateRangePicker(false);
                      addNotification(`Date range applied: ${format(parseISO(customDateRange.start), 'dd.MM.yyyy')} - ${format(parseISO(customDateRange.end), 'dd.MM.yyyy')}`, 'success');
                    }
                  }}
                  disabled={!customDateRange.start || !customDateRange.end}
                >
                  <Calendar size={12} />
                  Apply Date Range
                </button>
                <button
                  className="clear-date-range"
                  onClick={() => {
                    setCustomDateRange({ start: '', end: '' });
                    setTimeRange('all'); // Reset to default 'all'
                  }}
                >
                  <RotateCcw size={12} />
                  Clear Range
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Advanced Analytics Panel */}
      {showAnalytics && (
        <div className="analytics-panel">
          <div className="analytics-header">
            <h3><BarChart3 size={20} /> Advanced Analytics</h3>
            <button className="close-analytics" onClick={() => setShowAnalytics(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Peak Activity Hour</h4>
              <div className="metric-huge">{advancedAnalytics.peakHour}:00</div>
              <p>Highest activity period</p>
            </div>

            <div className="analytics-card">
              <h4>Most Active User</h4>
              <div className="metric-huge">{advancedAnalytics.mostActiveUser}</div>
              <p>User with most events</p>
            </div>

            <div className="analytics-card">
              <h4>Top Device</h4>
              <div className="metric-huge">{advancedAnalytics.mostUsedDevice}</div>
              <p>Most frequently used device</p>
            </div>

            <div className="analytics-card">
              <h4>Daily Average</h4>
              <div className="metric-huge">{Math.round(advancedAnalytics.averageEventsPerDay)}</div>
              <p>Events per day</p>
            </div>
          </div>

          <div className="hourly-chart">
            <h4>Hourly Activity Distribution</h4>
            <div className="hour-bars">
              {advancedAnalytics.hourlyDistribution.map((count, hour) => (
                <div key={hour} className="hour-bar-container">
                  <div
                    className="hour-bar"
                    style={{
                      height: `${(count / Math.max(...advancedAnalytics.hourlyDistribution)) * 100}%`
                    }}
                    title={`${hour}:00 - ${count} events`}
                  ></div>
                  <span className="hour-label">{hour}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Panel */}
      {showPreview && (
        <div className="preview-panel">
          <div className="preview-header">
            <h3><Eye size={16} /> Live Preview</h3>
            <div className="preview-stats">
              <span className="preview-stat">
                <strong>{statistics.totalEvents}</strong> events
              </span>
              <span className="preview-stat">
                <strong>{statistics.successRate}%</strong> success rate
              </span>
              <span className="preview-stat">
                <strong>{getActiveFilters().length}</strong> filters active
              </span>
            </div>
          </div>
          <div className="preview-content">
            <div className="mini-chart">
              <HeatmapChart
                data={filteredData.slice(0, 20)}
                width={600}
                height={200}
                onCellClick={optimizedCellClick}
                showGradient={showGradient}
                showAccessibilityPatterns={showAccessibilityPatterns}
                granularity={granularity}
              />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Legend */}
      <div className="legend">
        <div className="legend-section">
          <h4>Status Legend:</h4>
          <div className="legend-items">
            {Object.entries(statusColorMap).map(([status, color]) => (
              <div key={status} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: color }}>
                  {statusIcons[status]}
                </div>
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="legend-section">
          <h4>View: {granularity}</h4>
          <div className="intensity-scale">
            <span>Low</span>
            <div className="intensity-gradient"></div>
            <span>High</span>
          </div>
        </div>

        <div className="legend-section">
          <small>💡 Click cells for details • Use preview for live changes • Click stats to filter</small>
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="chart-container" style={{ willChange: 'transform' }}>
        {activeTab === 'Overview' ? (
          renderChart(filteredData, 'Overview')
        ) : activeTab === 'Transaction' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>💳 Transaction Analysis</h2>
              <p>Detailed transaction patterns and financial activity monitoring</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card">
                <h3>Transaction Volume</h3>
                <div className="metric-large">{statistics.totalEvents * 1.2 | 0}</div>
                <p>Total transactions processed</p>
              </div>
              <div className="tab-card">
                <h3>Success Rate</h3>
                <div className="metric-large">{statistics.successRate}%</div>
                <p>Successful transaction rate</p>
              </div>
              <div className="tab-card">
                <h3>Failed Transactions</h3>
                <div className="metric-large">{statistics.failedEvents}</div>
                <p>Transactions requiring review</p>
              </div>
              <div className="tab-card">
                <h3>Average Amount</h3>
                <div className="metric-large">$1,247</div>
                <p>Average transaction value</p>
              </div>
            </div>

            {/* Transaction Heatmap */}
            <div className="tab-chart-section">
              <h4>📊 Transaction Activity Heatmap</h4>
              {renderChart(filteredData, 'Transaction')}
            </div>

            <div className="transaction-table">
              <h4>Recent Transactions</h4>
              <table>
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td>TXN_{Math.random().toString(36).substr(2, 8).toUpperCase()}</td>
                      <td>${(Math.random() * 5000 + 100).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {statusIcons[item.status]} {item.status}
                        </span>
                      </td>
                      <td>{format(parseISO(item.date), 'MMM dd, yyyy')}</td>
                      <td>{item.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Association' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>🔗 Association Analysis</h2>
              <p>User behavior patterns and device associations</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card">
                <h3>User-Device Links</h3>
                <div className="metric-large">{statistics.users * 2.3 | 0}</div>
                <p>Active associations detected</p>
              </div>
              <div className="tab-card">
                <h3>Multi-Device Users</h3>
                <div className="metric-large">{(statistics.users * 0.4) | 0}</div>
                <p>Users with multiple devices</p>
              </div>
              <div className="tab-card">
                <h3>Shared Devices</h3>
                <div className="metric-large">{(statistics.devices * 0.2) | 0}</div>
                <p>Devices used by multiple users</p>
              </div>
              <div className="tab-card">
                <h3>Risk Score</h3>
                <div className="metric-large">3.2</div>
                <p>Average association risk level</p>
              </div>
            </div>

            {/* Association Heatmap */}
            <div className="tab-chart-section">
              <h4>🔗 User-Device Association Patterns</h4>
              {renderChart(filteredData, 'Association')}
            </div>

            <div className="association-network">
              <h4>User-Device Network</h4>
              <div className="network-visualization">
                <p>🌐 Interactive network visualization showing user-device relationships</p>
                <div className="network-stats">
                  <div>👥 {statistics.users} Users</div>
                  <div>📱 {statistics.devices} Devices</div>
                  <div>🔗 {statistics.users * 1.8 | 0} Connections</div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Behaviour' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>🎯 Behavior Analysis</h2>
              <p>User behavior patterns and anomaly detection</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card">
                <h3>Normal Patterns</h3>
                <div className="metric-large">{(statistics.successEvents / statistics.totalEvents * 100).toFixed(1)}%</div>
                <p>Activities following normal patterns</p>
              </div>
              <div className="tab-card">
                <h3>Anomalies Detected</h3>
                <div className="metric-large">{(statistics.failedEvents * 0.3) | 0}</div>
                <p>Suspicious behavior instances</p>
              </div>
              <div className="tab-card">
                <h3>User Profiles</h3>
                <div className="metric-large">{statistics.users}</div>
                <p>Behavioral profiles created</p>
              </div>
              <div className="tab-card">
                <h3>Risk Level</h3>
                <div className="metric-large">Medium</div>
                <p>Overall behavioral risk assessment</p>
              </div>
            </div>

            {/* Behavior Heatmap */}
            <div className="tab-chart-section">
              <h4>🎯 Behavioral Pattern Analysis</h4>
              {renderChart(filteredData, 'Behaviour')}
            </div>

            <div className="behavior-patterns">
              <h4>Behavior Patterns</h4>
              <div className="pattern-list">
                <div className="pattern-item">
                  <span className="pattern-icon">🕐</span>
                  <div>
                    <strong>Peak Activity Hours:</strong> 9 AM - 5 PM
                  </div>
                </div>
                <div className="pattern-item">
                  <span className="pattern-icon">📍</span>
                  <div>
                    <strong>Common Locations:</strong> Office, Home, Mobile
                  </div>
                </div>
                <div className="pattern-item">
                  <span className="pattern-icon">⚠️</span>
                  <div>
                    <strong>Anomaly Triggers:</strong> Off-hours access, New locations
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'FCR Score' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>📊 FCR Score Analysis</h2>
              <p>Financial Crime Risk scoring and assessment</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card high-risk">
                <h3>High Risk</h3>
                <div className="metric-large">{(statistics.failedEvents * 0.6) | 0}</div>
                <p>Users requiring immediate attention</p>
              </div>
              <div className="tab-card medium-risk">
                <h3>Medium Risk</h3>
                <div className="metric-large">{(statistics.warningEvents * 1.2) | 0}</div>
                <p>Users under monitoring</p>
              </div>
              <div className="tab-card low-risk">
                <h3>Low Risk</h3>
                <div className="metric-large">{(statistics.successEvents * 0.8) | 0}</div>
                <p>Users with clean profiles</p>
              </div>
              <div className="tab-card">
                <h3>Average Score</h3>
                <div className="metric-large">6.8</div>
                <p>Out of 10 (lower is better)</p>
              </div>
            </div>

            {/* FCR Score Heatmap */}
            <div className="tab-chart-section">
              <h4>📊 Risk Score Distribution Over Time</h4>
              {renderChart(filteredData, 'FCR Score')}
            </div>

            <div className="fcr-breakdown">
              <h4>Risk Distribution</h4>
              <div className="risk-chart">
                <div className="risk-bar">
                  <div className="risk-segment high" style={{width: '15%'}}>High (15%)</div>
                  <div className="risk-segment medium" style={{width: '25%'}}>Medium (25%)</div>
                  <div className="risk-segment low" style={{width: '60%'}}>Low (60%)</div>
                </div>
              </div>
              <div className="score-factors">
                <h5>Key Risk Factors:</h5>
                <ul>
                  <li>🚨 Multiple failed authentication attempts</li>
                  <li>🌍 Access from unusual locations</li>
                  <li>⏰ Activity outside normal business hours</li>
                  <li>💰 High-value transaction patterns</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === 'Sanction' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>🛡️ Sanction Screening</h2>
              <p>Compliance monitoring and watchlist screening</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card">
                <h3>Screens Performed</h3>
                <div className="metric-large">{statistics.totalEvents * 2.1 | 0}</div>
                <p>Total sanction checks completed</p>
              </div>
              <div className="tab-card">
                <h3>Matches Found</h3>
                <div className="metric-large">{(statistics.failedEvents * 0.1) | 0}</div>
                <p>Potential watchlist matches</p>
              </div>
              <div className="tab-card">
                <h3>False Positives</h3>
                <div className="metric-large">{(statistics.warningEvents * 0.7) | 0}</div>
                <p>Cleared after review</p>
              </div>
              <div className="tab-card">
                <h3>Active Cases</h3>
                <div className="metric-large">{(statistics.failedEvents * 0.05) | 0}</div>
                <p>Under investigation</p>
              </div>
            </div>

            {/* Sanction Screening Heatmap */}
            <div className="tab-chart-section">
              <h4>🛡️ Sanction Screening Activity</h4>
              {renderChart(filteredData, 'Sanction')}
            </div>

            <div className="sanction-lists">
              <h4>Monitored Lists</h4>
              <div className="list-grid">
                <div className="list-item">
                  <strong>OFAC SDN</strong>
                  <span>Updated daily</span>
                </div>
                <div className="list-item">
                  <strong>UN Sanctions</strong>
                  <span>Updated weekly</span>
                </div>
                <div className="list-item">
                  <strong>EU Sanctions</strong>
                  <span>Updated daily</span>
                </div>
                <div className="list-item">
                  <strong>PEP Database</strong>
                  <span>Updated monthly</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Evidence' ? (
          <div className="tab-content">
            <div className="tab-header">
              <h2>📋 Evidence Management</h2>
              <p>Digital evidence collection and audit trails</p>
            </div>
            <div className="tab-grid">
              <div className="tab-card">
                <h3>Evidence Items</h3>
                <div className="metric-large">{statistics.totalEvents * 3.2 | 0}</div>
                <p>Total evidence pieces collected</p>
              </div>
              <div className="tab-card">
                <h3>Active Cases</h3>
                <div className="metric-large">{(statistics.failedEvents * 0.8) | 0}</div>
                <p>Cases with evidence gathering</p>
              </div>
              <div className="tab-card">
                <h3>Chain of Custody</h3>
                <div className="metric-large">100%</div>
                <p>Evidence integrity maintained</p>
              </div>
              <div className="tab-card">
                <h3>Retention Period</h3>
                <div className="metric-large">7 Years</div>
                <p>Evidence storage duration</p>
              </div>
            </div>

            {/* Evidence Management Heatmap */}
            <div className="tab-chart-section">
              <h4>📋 Evidence Collection Timeline</h4>
              {renderChart(filteredData, 'Evidence')}
            </div>

            <div className="evidence-types">
              <h4>Evidence Categories</h4>
              <div className="evidence-grid">
                <div className="evidence-item">
                  <span className="evidence-icon">📸</span>
                  <div>
                    <strong>Screenshots</strong>
                    <p>{(statistics.totalEvents * 0.4) | 0} items</p>
                  </div>
                </div>
                <div className="evidence-item">
                  <span className="evidence-icon">📄</span>
                  <div>
                    <strong>Log Files</strong>
                    <p>{(statistics.totalEvents * 1.2) | 0} items</p>
                  </div>
                </div>
                <div className="evidence-item">
                  <span className="evidence-icon">🎥</span>
                  <div>
                    <strong>Session Recordings</strong>
                    <p>{(statistics.totalEvents * 0.2) | 0} items</p>
                  </div>
                </div>
                <div className="evidence-item">
                  <span className="evidence-icon">💾</span>
                  <div>
                    <strong>Database Exports</strong>
                    <p>{(statistics.totalEvents * 0.6) | 0} items</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Enhanced Details Modal */}
      {selectedCell && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h3>{selectedCell.activityType}</h3>
                <span className="modal-subtitle">
                  {selectedCell.periodLabel}
                </span>
              </div>
              <button className="close-button" onClick={closeDetailsModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-summary">
                <div className="summary-stats">
                  <div className="summary-stat">
                    <div className="summary-value">{selectedCell.events.length}</div>
                    <div className="summary-label">Total Events</div>
                  </div>
                  <div className="summary-stat">
                    <div className="summary-value" style={{ color: statusColorMap[selectedCell.status] }}>
                      {statusIcons[selectedCell.status]} {selectedCell.status.toUpperCase()}
                    </div>
                    <div className="summary-label">Dominant Status</div>
                  </div>
                  <div className="summary-stat">
                    <div className="summary-value">{Math.round(selectedCell.intensity * 100)}%</div>
                    <div className="summary-label">Intensity</div>
                  </div>
                  <div className="summary-stat">
                    <div className="summary-value">{new Set(selectedCell.events.map(e => e.user)).size}</div>
                    <div className="summary-label">Unique Users</div>
                  </div>
                </div>
              </div>

              {selectedCell.events.length > 0 && (
                <div className="events-section">
                  <h4>Event Details ({selectedCell.events.length})</h4>
                  <div className="events-grid">
                    {selectedCell.events.map((event, index) => (
                      <div key={index} className="event-card enhanced">
                        <div className="event-header">
                          <span className="event-date">
                            {format(parseISO(event.date), 'MMM dd, yyyy HH:mm')}
                          </span>
                          <span
                            className="event-status"
                            style={{ backgroundColor: statusColorMap[event.status] }}
                          >
                            {statusIcons[event.status]} {event.status}
                          </span>
                        </div>
                        <div className="event-details">
                          <div className="event-detail-row">
                            <Users size={14} />
                            <span><strong>User:</strong> {event.user}</span>
                          </div>
                          <div className="event-detail-row">
                            <Activity size={14} />
                            <span><strong>Device:</strong> {event.device}</span>
                          </div>
                          <div className="event-detail-row">
                            <span><strong>IP:</strong> 192.168.{Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}</span>
                          </div>
                          <div className="event-detail-row">
                            <span><strong>Session:</strong> sess_{Math.random().toString(36).substr(2, 9)}</span>
                          </div>
                          <div className="event-detail-row">
                            <span><strong>Duration:</strong> {Math.floor(Math.random() * 300) + 10}s</span>
                          </div>
                          <div className="event-detail-row">
                            <span><strong>Location:</strong> {['New York', 'London', 'Tokyo', 'Sydney', 'Berlin'][Math.floor(Math.random() * 5)]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;