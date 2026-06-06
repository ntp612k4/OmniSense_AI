export const kpis = [
  {
    label: 'Total feedback',
    value: '24,918',
    delta: '+12.4%',
    tone: 'blue',
    description: 'Across connected channels',
  },
  {
    label: 'Negative rate',
    value: '8.7%',
    delta: '-3.1%',
    tone: 'red',
    description: 'Priority reviews this week',
  },
  {
    label: 'Neutral rate',
    value: '34.2%',
    delta: '+1.8%',
    tone: 'slate',
    description: 'Reviews needing follow-up',
  },
  {
    label: 'AI confidence',
    value: '91.6%',
    delta: '+4.6%',
    tone: 'amber',
    description: 'Average model confidence',
  },
];

export const sentimentTrend = [
  { label: 'Mon', positive: 66, neutral: 24, negative: 10 },
  { label: 'Tue', positive: 61, neutral: 28, negative: 11 },
  { label: 'Wed', positive: 69, neutral: 22, negative: 9 },
  { label: 'Thu', positive: 58, neutral: 30, negative: 12 },
  { label: 'Fri', positive: 72, neutral: 20, negative: 8 },
  { label: 'Sat', positive: 77, neutral: 18, negative: 5 },
  { label: 'Sun', positive: 74, neutral: 19, negative: 7 },
];

export const feedbackRows = [
  {
    source: 'Facebook',
    sentiment: 'Negative',
    domain: 'Service',
    language: 'Vietnamese',
    confidence: '94.2%',
    status: 'Escalate',
  },
  {
    source: 'App Store',
    sentiment: 'Positive',
    domain: 'Product',
    language: 'English',
    confidence: '96.8%',
    status: 'Resolved',
  },
  {
    source: 'Email',
    sentiment: 'Neutral',
    domain: 'Support',
    language: 'French',
    confidence: '84.1%',
    status: 'Review',
  },
  {
    source: 'CSV Upload',
    sentiment: 'Negative',
    domain: 'Billing',
    language: 'German',
    confidence: '89.5%',
    status: 'Escalate',
  },
  {
    source: 'Amazon',
    sentiment: 'Positive',
    domain: 'Delivery',
    language: 'English',
    confidence: '92.7%',
    status: 'Resolved',
  },
];
