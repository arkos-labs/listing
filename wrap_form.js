const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const anchorStart = `        ) : null}

        <Field
          label="Enlèvement"`;

const replacementStart = `        ) : null}

        {form.vehicule ? (
          <>
            <Field
              label="Enlèvement"`;

const anchorEnd = `          )}
        </TouchableOpacity>
      </View>
    </ScrollView>`;

const replacementEnd = `          )}
        </TouchableOpacity>
          </>
        ) : (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center', fontWeight: '500' }}>
              Sélectionnez d'abord un type de course pour commencer la saisie.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>`;

content = content.replace(anchorStart, replacementStart);
content = content.replace(anchorEnd, replacementEnd);

fs.writeFileSync(filePath, content);
console.log('Wrapped the rest of the form');
