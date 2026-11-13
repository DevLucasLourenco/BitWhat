# Publicar uma nova versão do BitWhat

Este guia explica como publicar uma versão nova do BitWhat. A publicação usa as
[Releases do GitHub](https://github.com/DevLucasLourenco/BitWhat/releases) e
roda **nesta máquina**, sem GitHub Actions. Quem já tem o BitWhat instalado
recebe a versão nova pela atualização automática.

## Resumo

```bash
npm version patch --no-git-tag-version   # 1. sobe a versão (ou minor / major)
git commit -am "chore: release X.Y.Z"    # 2. registra a versão
git push                                 # 3. envia ao GitHub
npm run release                          # 4. gera o instalador e publica a Release
```

## Pré-requisitos (uma vez só)

- Node.js 20 ou superior e as dependências instaladas (`npm install`).
- [GitHub CLI](https://cli.github.com/) logado numa conta com permissão de
  escrita no repositório:

  ```bash
  gh auth login
  gh auth status   # deve mostrar "Logged in" e o escopo "repo"
  ```

  O script pega o token pelo `gh auth token`. Se preferir, defina a variável
  `GH_TOKEN` antes de rodar, e ela tem prioridade. O token nunca é impresso
  nem gravado em arquivo.

## Passo a passo

### 1. Escolher a nova versão

A versão segue o padrão `MAJOR.MINOR.PATCH`, definido no `package.json`:

| Comando                                 | Quando usar                                | Exemplo        |
| --------------------------------------- | ------------------------------------------ | -------------- |
| `npm version patch --no-git-tag-version` | correções e ajustes pequenos               | 0.1.19 → 0.1.20 |
| `npm version minor --no-git-tag-version` | funcionalidades novas                      | 0.1.19 → 0.2.0  |
| `npm version major --no-git-tag-version` | mudanças grandes ou incompatíveis          | 0.1.19 → 1.0.0  |

Use sempre `--no-git-tag-version`: quem cria a tag `vX.Y.Z` é a publicação,
no passo 4.

### 2 e 3. Commit e push

Todas as alterações da versão precisam estar commitadas e enviadas ao `master`:

```bash
git commit -am "chore: release X.Y.Z"
git push
```

### 4. Publicar

```bash
npm run release
```

O comando (`scripts/release.mjs`) faz o seguinte, na ordem:

1. **Confere o repositório.** Não pode haver alterações sem commit, a branch
   precisa ser `master` e o `master` local precisa estar igual ao
   `origin/master`. Assim o que vai para a Release é exatamente o código que
   está no GitHub.
2. **Confere a versão.** Se a Release `vX.Y.Z` já existir, o comando para em
   vez de sobrescrevê-la.
3. **Compila** (`npm run build`, que inclui a checagem de tipos) e **gera o
   instalador** NSIS. O ícone e a versão são gravados no `BitWhat.exe`.
4. **Publica** a Release `vX.Y.Z` no GitHub. A tag é criada a partir do
   `master`, e três arquivos são enviados:

   | Arquivo                          | Para que serve                                                   |
   | -------------------------------- | ---------------------------------------------------------------- |
   | `BitWhat-X.Y.Z-Setup.exe`        | instalador (também serve para instalar manualmente)              |
   | `BitWhat-X.Y.Z-Setup.exe.blockmap` | permite baixar só as partes que mudaram entre versões          |
   | `latest.yml`                     | o app lê este arquivo para saber qual é a versão mais recente    |

5. **Confere a Release.** Se faltar algum dos três arquivos, o comando
   avisa.

No final, a saída esperada é:

```text
✔ Release vX.Y.Z publicada com latest.yml, BitWhat-X.Y.Z-Setup.exe, BitWhat-X.Y.Z-Setup.exe.blockmap
```

## Como a atualização chega a quem já usa o BitWhat

- O app procura atualização **5 s depois de abrir** e **a cada 6 horas**
  (`src/main/services/auto-updater.ts`).
- Quando acha uma versão mais nova, baixa em segundo plano, sem interromper o
  uso.
- Com o download pronto, o app avisa de duas formas: uma notificação do
  Windows ("BitWhat X.Y.Z pronto para instalar") e uma faixa no topo com o
  botão **Reiniciar agora**.
- A instalação acontece ao clicar em **Reiniciar agora** ou, se o usuário não
  clicar, na próxima vez que ele sair do BitWhat (bandeja → Sair).
- A verificação só funciona no app instalado. Com `npm run dev` ela fica
  desativada.

Para ver o que aconteceu numa máquina, abra
`%APPDATA%\BitWhat\logs\bitwhat.log` e procure as linhas
`Auto-updater: ...` (`verificando updates`, `update disponível`,
`app atualizado`, `erro`).

## Problemas comuns

| Mensagem do `npm run release`                           | O que fazer                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Há alterações não commitadas`                          | Faça commit (e push) ou descarte as alterações.                             |
| `Publique a partir do master`                           | `git checkout master`.                                                      |
| `O master local difere do origin/master`                | `git push` (commits locais) ou `git pull` (commits remotos).                |
| `A Release vX.Y.Z já existe`                            | Suba a versão (passo 1). Uma versão publicada não é reaproveitada.          |
| `Sem token do GitHub`                                   | `gh auth login`, ou defina `GH_TOKEN`.                                      |
| `Release vX.Y.Z criada, mas faltam arquivos`            | A publicação foi interrompida. Veja "Publicação interrompida", abaixo.      |

### Publicação interrompida

Se a internet cair no meio do envio, a Release pode ficar incompleta. Nesse
caso, apague a Release e a tag e rode `npm run release` de novo:

```bash
gh release delete vX.Y.Z --cleanup-tag --yes
npm run release
```

### Versão publicada com problema

O app não volta para versões anteriores sozinho. Para corrigir, publique uma
versão **mais nova** com a correção (passos 1 a 4). Apague uma Release já
distribuída só se ela não deve mais ser instalada por ninguém.

## Observações

- **Sem GitHub Actions:** a publicação não usa Actions. O workflow
  `.github/workflows/build.yml` só confere os tipos e gera o instalador de
  teste nos pushes ao `master`, sem publicar nada. Como o repositório é
  público, esse uso de Actions não desconta minutos da cota da conta.
- **Assinatura de código:** o instalador não é assinado. Na instalação manual,
  o Windows SmartScreen pode mostrar um aviso (clique em "Mais informações" →
  "Executar assim mesmo").
- **Repositório público:** tudo o que vai para a Release fica acessível a
  qualquer pessoa. Não inclua no build arquivos com dados internos, credenciais
  ou informações de clientes.
