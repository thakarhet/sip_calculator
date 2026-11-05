import { z } from 'zod';
import Plan from '../models/Plan.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const amount = z.number().finite().min(1).max(100000000);
const projectedValue = z.number().finite().min(0).max(1000000000000000);
const planSchema = z.object({
  name: z.string().trim().min(1).max(100),
  calculatorType: z.enum(['sip', 'lump sum']),
  inputs: z.object({ amount, years: z.number().int().min(1).max(50), rate: z.number().min(0).max(100), stepUp: z.number().min(0).max(100).optional(), frequency: z.enum(['monthly', 'quarterly']).optional() }).strict(),
  result: z.object({ invested: amount, futureValue: projectedValue, returns: projectedValue }).strict(),
}).strict();
const exportSchema = z.object({
  calculatorType: z.enum(['sip', 'lump sum']),
  inputs: z.object({
    amount,
    years: z.number().int().min(1).max(50),
    rate: z.number().finite().min(0).max(100),
    stepUp: z.number().finite().min(0).max(100).optional(),
    frequency: z.enum(['monthly', 'quarterly']).optional(),
  }).strict(),
}).strict();

export const listPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ user: req.user.id }).sort({ updatedAt: -1 }).limit(100).lean();
  res.json({ plans });
});

export const createPlan = asyncHandler(async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Plan details are invalid.', errors: parsed.error.flatten().fieldErrors });
  const plan = await Plan.create({ ...parsed.data, user: req.user.id });
  res.status(201).json({ plan });
});

export const exportProjection = (req, res) => {
  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Projection details are invalid.' });

  const { calculatorType, inputs } = parsed.data;
  const { amount: contribution, years, rate, stepUp = 0, frequency = 'monthly' } = inputs;
  let invested = 0;
  let futureValue = 0;

  if (calculatorType === 'lump sum') {
    invested = contribution;
    futureValue = contribution * Math.pow(1 + rate / 100, years);
  } else {
    const periodsPerYear = frequency === 'monthly' ? 12 : 4;
    const periodicRate = Math.pow(1 + rate / 100, 1 / periodsPerYear) - 1;
    for (let year = 1; year <= years; year++) {
      const yearlyContribution = contribution * Math.pow(1 + stepUp / 100, year - 1);
      for (let period = 0; period < periodsPerYear; period++) {
        invested += yearlyContribution;
        futureValue = (futureValue + yearlyContribution) * (1 + periodicRate);
      }
    }
  }

  const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(value));
  const frequencyLabel = calculatorType === 'lump sum' ? 'one time' : frequency;
  const lines = [
    'Growwise investment projection',
    `Plan: ${calculatorType === 'sip' ? 'SIP' : 'Lump sum'}`,
    `Starting contribution: ${formatMoney(contribution)} / ${frequencyLabel}`,
    `Duration: ${years} years`,
    `Assumed annual return: ${rate}%`,
    ...(calculatorType === 'sip' ? [`Annual contribution increase: ${stepUp}%`] : []),
    `Total invested: ${formatMoney(invested)}`,
    `Estimated value: ${formatMoney(futureValue)}`,
    `Estimated growth: ${formatMoney(futureValue - invested)}`,
    '',
    'Illustration only. Actual mutual fund returns are market-linked and not guaranteed.',
  ];

  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="growwise-projection.txt"', 'Cache-Control': 'private, no-store' });
  res.send(lines.join('\n'));
};

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!plan) return res.status(404).json({ message: 'Plan not found.' });
  res.status(204).end();
});
