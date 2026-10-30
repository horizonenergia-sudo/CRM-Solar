'use client'

import { RepPerformanceData } from '@/actions/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function RepLeaderboard({ reps }: { reps: RepPerformanceData[] }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Vendedores</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <th className="w-8">#</th>
              <th>Vendedor</th>
              <th className="text-right">Leads</th>
              <th className="text-right">Propostas</th>
              <th className="text-right">Fechados</th>
              <th className="text-right">Receita</th>
              <th className="text-right">Conversão</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reps.map((rep, index) => (
              <TableRow key={rep.userId}>
                <TableCell className="font-bold text-primary">{index + 1}</TableCell>
                <TableCell className="font-medium">{rep.fullName}</TableCell>
                <TableCell className="text-right">{rep.leadsCount}</TableCell>
                <TableCell className="text-right">{rep.proposalsSent}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">{rep.dealsWon}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(rep.revenueCents)}</TableCell>
                <TableCell className="text-right">{rep.conversionRate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
            {reps.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum dado de vendedores disponível
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}