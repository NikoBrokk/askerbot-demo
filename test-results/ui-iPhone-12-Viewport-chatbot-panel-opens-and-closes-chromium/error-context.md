# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Åpne chat med Gabrielsen AI" [active] [ref=e2] [cursor=pointer]:
    - img "Gabrielsen AI" [ref=e3]
  - dialog:
    - button: ×
    - generic:
      - log:
        - listitem:
          - img
          - generic: Hei på deg 😄 Jeg er Gabrielsen AI – like pålitelig som flomlyset på Føyka en mandag kveld! Spør meg om alt fra klubbhistorie til trenerteam!
      - generic:
        - button: OBOS Akademi
        - button: A-laget
        - button: Akademi+
        - button: Kontakt klubben
    - generic:
      - generic:
        - textbox:
          - /placeholder: Skriv en melding …
        - button: Send
    - generic:
      - generic:
        - text: Levert av
        - link:
          - /url: https://lupenobos.no
          - text: Gabrielsen AI
      - link:
        - /url: https://lupenobos.no
        - img
```