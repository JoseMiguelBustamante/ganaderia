import { test, expect } from '@playwright/test';

// S4/S6: real React → API → PostgreSQL flow, no mocked responses.
// Parent starts the migrated API and Vite before running this spec.
// Vite proxies /api to 127.0.0.1:3100; VITE_API_URL optionally overrides it.
test('registro, alta de animal y fase 1 descuentan un insumo', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByRole('heading', { name: 'Registro demo' })).toBeVisible();
    await page.getByRole('button', { name: 'Registrarme y entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Animales', exact: true })).toBeVisible();

    await expect(page.getByTestId('animal-ear-tag-input')).toBeEnabled();
    await page.getByTestId('animal-ear-tag-input').fill('E-0001');
    await page.getByLabel('Sexo', { exact: true }).selectOption('male');
    await page.getByTestId('animal-create-button').click();
    const row = page.getByTestId('animal-row').filter({ hasText: 'E-0001' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('male');

    await page.getByRole('button', { name: 'Ir a protocolo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Protocolo demo', exact: true })).toBeVisible();
    await page.getByTestId('demo-setup-button').click();
    await expect(page.getByTestId('stock-readout')).toHaveText('Stock restante: 3');
    await page.getByTestId('phase-execute-button').click();
    await expect(page.getByText('Fase 1 completada', { exact: true })).toBeVisible();
    await expect(page.getByTestId('stock-readout')).toHaveText('Stock restante: 2');
});
