# Kms Porto

Aplicação web simples para registo diário de kms, foto do quadrante e fotos de talões, com partilha semanal.

## O que faz

- guarda os registos localmente no telemóvel usando IndexedDB
- calcula os kms do dia
- permite anexar foto do quadrante
- permite anexar até 5 fotos de talões por registo
- gera resumo semanal
- exporta CSV
- tenta partilhar o resumo semanal com ficheiros usando a partilha nativa do dispositivo

## Como usar localmente

Basta alojar estes ficheiros num servidor web estático.

### Opção simples

1. Colocar a pasta num alojamento estático HTTPS, por exemplo Netlify ou Vercel.
2. Abrir a app no telemóvel.
3. Adicionar ao ecrã principal.

## Importante

- para a partilha nativa com `navigator.share()` e `navigator.canShare()` funcionar de forma consistente, usa HTTPS
- no iPhone, a opção de instalação costuma ser `Partilhar > Adicionar ao ecrã principal`
- como os dados são guardados no próprio telemóvel, apagar os dados do browser apaga os registos

## Próximos melhoramentos possíveis

- envio direto para um email fixo
- exportação PDF
- pin de acesso por comercial
- assinatura no fim da semana
- sincronização opcional para Google Drive, Supabase ou Firebase
